"""FastAPI 앱 진입점.

⚠️ 팀컨벤션 §2-4 공유 파일 — 변경 시 전원 합의 필수.
   이 파일은 초안(병찬 작성). 실제 머지 전 팀 합의 필요.

⚠️ 데모 전용 인증 한계 (code-reviewer C2·C3 지적):
   1. **JWT 검증 미구현** — `apiClient.ts`가 `Authorization: Bearer` 헤더를
      보내지만 백엔드는 아직 읽지 않음. `routers/db_manager.py`는 `X-User-Id`
      헤더만 신뢰하므로 **헤더 위조 가능**. 프로덕션 직전 Supabase JWT 미들웨어
      (`fastapi-jwt` 등) 도입 필수.
   2. **RLS 정책 부재** — DATABASE_URL (서비스 롤) 로 직접 접속 시 모든 f1_*
      행이 노출됨. 009_f1_rls_policies.sql 초안(팀 합의 대기) 참고.
   3. 결과: 현재 상태는 **내부 데모 시연용**. 외부 공개 환경 배포 금지.

역할:
    - FastAPI 앱 생성
    - CORS 설정
    - DB 커넥션 풀 lifespan 훅
    - 라우터 등록
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).parent / ".env")

from backend.db.connection import close_pool, init_pool
from backend.routers import admin_laws, db_manager, features


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 DB pool 초기화, 종료 시 정리."""
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        try:
            await init_pool(dsn)
            print("[lifespan] DB pool initialized")
        except Exception as exc:  # noqa: BLE001
            print(f"[lifespan] DB pool init failed: {exc}")
    else:
        print("[lifespan] DATABASE_URL missing — DB 기능 비활성화")

    yield

    try:
        await close_pool()
        print("[lifespan] DB pool closed")
    except Exception:
        pass


app = FastAPI(
    title="SAMC 수입식품 검역 AI 플랫폼",
    version="0.1.0",
    description="기능1(수입 가능 여부) ~ 기능5(한글표시사항) 파이프라인 API",
    lifespan=lifespan,
)


# ── CORS ──────────────────────────────────────────────────
# C4 수정: wildcard origin은 literal 매칭이라 동작 안 함 → allow_origin_regex 분리.
_cors_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 라우터 등록 ────────────────────────────────────────────
app.include_router(admin_laws.router)  # 성은 (기능4 법령 업로드)
app.include_router(features.router)  # 병찬 (기능1 판정)
app.include_router(db_manager.router)  # 병찬 (DB 관리 CRUD)


# ── 헬스 체크 ──────────────────────────────────────────────
@app.get("/")
async def root() -> dict:
    return {
        "app": "SAMC",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/v1/health")
async def health() -> dict:
    return {"status": "healthy"}
