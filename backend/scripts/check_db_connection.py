"""Supabase 연결 상태 + 스키마 확인 진단 스크립트.

사용법:
    python -m backend.scripts.check_db_connection

출력:
    - 연결 성공/실패
    - PostgreSQL 버전
    - 공통 테이블(cases, documents, pipeline_steps 등) 존재 여부
    - f1_ 테이블 존재 여부 + 컬럼 정의 완료 여부
    - pg_trgm 확장 여부
    - search_f1_ingredients_trgm RPC 여부
    - 시드 데이터 건수
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass


# ── 공통 테이블 (combined_schema.sql 상단) ─────────────────
COMMON_TABLES = [
    "cases",
    "documents",
    "pipeline_steps",
    "law_alerts",
    "feedback_logs",
]

# ── f1_ 테이블 (기능1, 병찬) ────────────────────────────────
F1_TABLES = [
    "f1_allowed_ingredients",
    "f1_additive_limits",
    "f1_safety_standards",
    "f1_ingredient_synonyms",
    "f1_forbidden_ingredients",
    "f1_escalation_logs",
]

# ── 확장 ───────────────────────────────────────────────────
REQUIRED_EXTENSIONS = ["pg_trgm", "uuid-ossp"]

# ── RPC 함수 ───────────────────────────────────────────────
REQUIRED_FUNCTIONS = ["search_f1_ingredients_trgm"]


# ── f1_ 컬럼 정의 완료 여부 체크 (마이그레이션 002~007 적용 여부) ─
F1_COLUMN_CHECK = {
    "f1_allowed_ingredients": ["name_ko", "allowed_status", "ins_number", "cas_number"],
    "f1_additive_limits": [
        "additive_name",
        "max_ppm",
        "conversion_factor",
        "combined_group",
    ],
    "f1_safety_standards": ["target_name", "max_limit", "standard_type"],
    "f1_ingredient_synonyms": ["name_standard", "name_variant", "language"],
    "f1_forbidden_ingredients": ["name_ko", "aliases", "category", "is_verified"],
    "f1_escalation_logs": ["case_id", "trigger_type", "reason", "resolved"],
}


async def check_extension(conn: asyncpg.Connection, name: str) -> bool:
    row = await conn.fetchrow(
        "SELECT extversion FROM pg_extension WHERE extname = $1", name
    )
    return row is not None


async def check_function(conn: asyncpg.Connection, name: str) -> bool:
    row = await conn.fetchrow("SELECT proname FROM pg_proc WHERE proname = $1", name)
    return row is not None


async def check_table(conn: asyncpg.Connection, name: str) -> int | None:
    """테이블 존재 시 COUNT 반환, 없으면 None. 예외는 삼킴."""
    try:
        return await conn.fetchval(f"SELECT COUNT(*) FROM {name}")
    except (asyncpg.UndefinedTableError, asyncpg.InvalidTextRepresentationError):
        return None
    except Exception:
        return None


async def check_column(conn: asyncpg.Connection, table: str, column: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_name = $1 AND column_name = $2
            )
            """,
            table,
            column,
        )
    )


async def run() -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("[FAIL] DATABASE_URL 환경변수 없음. backend/.env 설정 필요.")
        return 1

    print("[INFO] Supabase 접속 시도...")
    try:
        # statement_cache_size=0: Supabase Transaction pooler(pgbouncer) 호환
        conn = await asyncpg.connect(dsn, command_timeout=15, statement_cache_size=0)
    except Exception as exc:  # noqa: BLE001
        print(f"[FAIL] 접속 실패: {exc}")
        return 2

    try:
        version = await conn.fetchval("SELECT version()")
        print(f"[OK]   접속됨\n       {version}\n")

        # 확장
        print("[SECTION] 확장")
        for ext in REQUIRED_EXTENSIONS:
            ok = await check_extension(conn, ext)
            print(f"   {'[OK] ' if ok else '[MISS]'} {ext}")

        # 공통 테이블
        print("\n[SECTION] 공통 테이블 (combined_schema.sql)")
        for tbl in COMMON_TABLES:
            count = await check_table(conn, tbl)
            if count is None:
                print(f"   [MISS] {tbl:<25} - 존재하지 않음")
            else:
                print(f"   [OK]   {tbl:<25} - {count}건")

        # f1_ 테이블
        print("\n[SECTION] f1_ 테이블 (기능1, 병찬)")
        for tbl in F1_TABLES:
            count = await check_table(conn, tbl)
            if count is None:
                print(f"   [MISS] {tbl:<30} - 테이블 없음")
                continue
            # 컬럼 정의 완료 여부 체크
            required_cols = F1_COLUMN_CHECK.get(tbl, [])
            missing_cols = []
            for c in required_cols:
                if not await check_column(conn, tbl, c):
                    missing_cols.append(c)
            if missing_cols:
                print(
                    f"   [PARTIAL] {tbl:<28} - {count}건, "
                    f"컬럼 미정의: {', '.join(missing_cols)}"
                )
            else:
                print(f"   [OK]      {tbl:<28} - {count}건, 컬럼 정의 완료")

        # RPC 함수
        print("\n[SECTION] RPC 함수")
        for fn in REQUIRED_FUNCTIONS:
            ok = await check_function(conn, fn)
            print(f"   {'[OK] ' if ok else '[MISS]'} {fn}()")

        # 기능1 준비도 종합
        print("\n[SECTION] 기능1 준비도 종합")

        permitted = (
            await conn.fetchval(
                "SELECT COUNT(*) FROM f1_allowed_ingredients WHERE allowed_status='permitted'"
            )
            if await check_table(conn, "f1_allowed_ingredients") is not None
            else None
        )
        restricted = (
            await conn.fetchval(
                "SELECT COUNT(*) FROM f1_allowed_ingredients WHERE allowed_status='restricted'"
            )
            if permitted is not None
            else None
        )
        prohibited = (
            await conn.fetchval(
                "SELECT COUNT(*) FROM f1_allowed_ingredients WHERE allowed_status='prohibited'"
            )
            if permitted is not None
            else None
        )

        if permitted is not None:
            print(
                f"   f1_allowed_ingredients:  permitted={permitted}, "
                f"restricted={restricted}, prohibited={prohibited}"
            )
            target_met = (permitted or 0) + (restricted or 0) + (prohibited or 0) >= 110
            print(
                f"   {'[OK] ' if target_met else '[WARN]'} 별표1·2·3 합계 110+건 목표"
            )

        try:
            fb_verified = await conn.fetchval(
                "SELECT COUNT(*) FROM f1_forbidden_ingredients WHERE is_verified=true"
            )
            print(
                f"   {'[OK] ' if fb_verified and fb_verified >= 8 else '[WARN]'} "
                f"f1_forbidden_ingredients (is_verified=true): {fb_verified}건"
            )
        except Exception:
            print("   [MISS] f1_forbidden_ingredients 테이블 없음")

        try:
            addv = await conn.fetchval(
                "SELECT COUNT(*) FROM f1_additive_limits WHERE is_verified=true"
            )
            safe = await conn.fetchval(
                "SELECT COUNT(*) FROM f1_safety_standards WHERE is_verified=true"
            )
            total = (addv or 0) + (safe or 0)
            print(
                f"   {'[OK] ' if total >= 15 else '[WARN]'} "
                f"기준치 is_verified=true 합계: {total}건 "
                f"(additive={addv}, safety={safe})"
            )
        except Exception:
            pass

        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(run()))
    except KeyboardInterrupt:
        print("\n[INT] 사용자 중단")
        sys.exit(130)
