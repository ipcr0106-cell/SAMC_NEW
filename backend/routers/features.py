"""기능1 파이프라인 엔드포인트.

담당: 병찬
경로: /api/v1/cases/{case_id}/pipeline/feature/1/...

엔드포인트:
    GET    /.../feature/1           결과 조회 (pipeline_steps.ai_result 또는 final_result)
    POST   /.../feature/1/run       기능1 실행 (DB 쿼리 → 판정)
    PATCH  /.../feature/1           담당자 수정 (final_result + edit_reason)
    POST   /.../feature/1/confirm   담당자 확인 완료 → 다음 단계 진행

참고:
    - 공통 테이블 cases/pipeline_steps 는 팀컨벤션 §2-4 공유 파일
    - 이 라우터는 조회·업데이트만 수행, 스키마 변경은 별도 PR
    - 입력 원재료 목록은 documents.parsed_md 에서 추출 (추후 연결)
"""

from __future__ import annotations

import json
from typing import Any, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db.connection import get_conn_dep
from backend.models.judgment import (Feature1Input, Feature1Output, Ingredient,
                                     ProcessConditions)
from backend.services.feature1 import run_feature1

router = APIRouter(
    prefix="/api/v1/cases",
    tags=["feature1"],
)


# ============================================================
# 공통 헬퍼
# ============================================================


async def _fetch_pipeline_step(
    db: asyncpg.Connection, case_id: str, step_key: str = "1"
) -> Optional[asyncpg.Record]:
    return await db.fetchrow(
        """
        SELECT id, case_id, step_key, step_name, status,
               ai_result, final_result, edit_reason,
               law_references, created_at, updated_at
          FROM pipeline_steps
         WHERE case_id = $1 AND step_key = $2
         LIMIT 1
        """,
        case_id,
        step_key,
    )


async def _upsert_pipeline_step(
    db: asyncpg.Connection,
    case_id: str,
    status: str,
    ai_result: dict,
) -> None:
    await db.execute(
        """
        INSERT INTO pipeline_steps (case_id, step_key, step_name, status, ai_result)
        VALUES ($1, '1', 'import_check', $2, $3::jsonb)
        ON CONFLICT (case_id, step_key) DO UPDATE
          SET status = EXCLUDED.status,
              ai_result = EXCLUDED.ai_result,
              updated_at = NOW()
        """,
        case_id,
        status,
        json.dumps(ai_result, ensure_ascii=False),
    )


def _to_pipeline_result(out: Feature1Output) -> dict:
    """백엔드 Feature1Output 을 팀 약속 Feature1Result (types/pipeline.ts) 형식으로 변환.

    약속 필드:
        ingredients[], verdict, import_possible, fail_reasons[], standards_check[]
    추가로 _internal 키에 상세 결과 포함 (프론트에서 선택 활용).
    """
    verdict_to_status = {
        "permitted": "allowed",
        "restricted": "allowed",
        "prohibited": "not_found",
        "unidentified": "not_found",
    }

    # H-NEW-1: 합성향료 원재료는 status=synthetic_flavor_warning 으로 override
    synthetic_set = set(out.synthetic_flavor_ingredients or [])

    ingredients_slim: list[dict] = []
    if out.aggregation:
        for r in out.aggregation.results:
            status: str
            if r.ingredient.name in synthetic_set:
                status = "synthetic_flavor_warning"
            else:
                status = verdict_to_status.get(r.verdict, "not_found")
            ingredients_slim.append(
                {
                    "name": r.ingredient.name,
                    "percentage": r.ingredient.percentage,
                    "status": status,
                    "law_ref": r.law_source,
                }
            )
    for h in out.forbidden_hits:
        ingredients_slim.append(
            {
                "name": h.name_ko,
                "percentage": None,
                "status": "not_found",
                "law_ref": h.law_source,
                "message": h.reason,
            }
        )

    fail_reasons: list[str] = []
    if out.forbidden_hits:
        fail_reasons.append(
            "절대 금지 원료: " + ", ".join(h.name_ko for h in out.forbidden_hits)
        )
    if out.aggregation and out.aggregation.prohibited > 0:
        fail_reasons.append(f"별표3 원료 {out.aggregation.prohibited}건 포함")
    if out.standards_check:
        for v in out.standards_check.violations:
            fail_reasons.append(f"{v.item_name} 기준치 초과")
        for cg in out.standards_check.compound_results:
            if cg.status == "fail":
                fail_reasons.append(f"{cg.group} 합산 {cg.total}>{cg.limit} {cg.unit}")

    standards_slim: list[dict] = []
    if out.standards_check:
        for c in out.standards_check.checks:
            # H8 수정: no_data는 actual=null 명시, 실측 0과 구분
            actual: Optional[float] = None
            if c.actual_value:
                try:
                    actual = float(c.actual_value.split()[0])
                except (ValueError, IndexError):
                    actual = None

            threshold: Optional[float] = None
            unit = ""
            if c.max_limit:
                try:
                    parts = c.max_limit.split()
                    threshold = float(parts[0])
                    unit = parts[1] if len(parts) > 1 else ""
                except (ValueError, IndexError):
                    # "불검출" 등 비수치는 threshold=None + unit=원문 보존 안 함
                    threshold = None
                    unit = ""
            status_map = {
                "pass": "pass",
                "fail": "fail",
                "no_data": "no_threshold",
                "warning": "no_threshold",
            }
            standards_slim.append(
                {
                    "ingredient_name": c.item_name,
                    "actual_value": actual,  # None(null) 허용
                    "unit": unit,
                    "threshold_value": threshold,
                    "threshold_text": c.max_limit,  # "불검출" 등 원문 보존
                    "status": status_map.get(c.status, "no_threshold"),
                    "law_ref": c.regulation_ref,
                }
            )

    return {
        "ingredients": ingredients_slim,
        "verdict": "수입가능" if out.import_possible else "수입불가",
        "import_possible": out.import_possible,
        "fail_reasons": fail_reasons,
        "standards_check": standards_slim,
        # 팀 약속 외 확장 정보 (프론트에서 선택 활용)
        "_internal": {
            "aggregation": out.aggregation.model_dump() if out.aggregation else None,
            "conditional_evaluations": [
                e.model_dump() for e in out.conditional_evaluations
            ],
            "forbidden_hits": [h.model_dump() for h in out.forbidden_hits],
            "escalations": out.escalations,
            "law_refs": [r.model_dump() for r in out.law_refs],
        },
    }


def _record_to_json(row: asyncpg.Record, field: str) -> Any:
    """asyncpg Record 의 jsonb 컬럼 값 파싱."""
    raw = row[field]
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


# ============================================================
# GET /feature/1 — 결과 조회
# ============================================================


class Feature1GetResponse(BaseModel):
    case_id: str
    status: str
    ai_result: Optional[dict] = None
    final_result: Optional[dict] = None
    edit_reason: Optional[str] = None
    law_references: Optional[Any] = None
    updated_at: Optional[str] = None


@router.get("/{case_id}/pipeline/feature/1", response_model=Feature1GetResponse)
async def get_feature1(
    case_id: str, db: asyncpg.Connection = Depends(get_conn_dep)
) -> Feature1GetResponse:
    row = await _fetch_pipeline_step(db, case_id, "1")
    if not row:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "FEATURE1_NOT_RUN",
                "message": "기능1이 아직 실행되지 않았습니다.",
                "feature": 1,
            },
        )
    return Feature1GetResponse(
        case_id=str(row["case_id"]),
        status=row["status"],
        ai_result=_record_to_json(row, "ai_result"),
        final_result=_record_to_json(row, "final_result"),
        edit_reason=row["edit_reason"],
        law_references=_record_to_json(row, "law_references"),
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
    )


# ============================================================
# POST /feature/1/run — 실행
# ============================================================


class Feature1RunRequest(BaseModel):
    """직접 원재료 목록을 전달받아 기능1 실행.

    실제 운영에서는 documents.parsed_md 에서 자동 추출하지만,
    데모·테스트를 위해 직접 페이로드 전달도 허용.
    """

    ingredients: list[Ingredient]
    food_type: Optional[str] = None
    process_conditions: Optional[ProcessConditions] = None


@router.post("/{case_id}/pipeline/feature/1/run")
async def run_feature1_endpoint(
    case_id: str,
    body: Feature1RunRequest,
    db: asyncpg.Connection = Depends(get_conn_dep),
) -> dict:
    try:
        out = await run_feature1(
            db=db,
            ingredients=body.ingredients,
            food_type=body.food_type,
            process_conditions=body.process_conditions or ProcessConditions(),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail={
                "error": "FEATURE1_RUN_FAILED",
                "message": f"기능1 실행 실패: {exc}",
                "feature": 1,
            },
        )

    ai_result = _to_pipeline_result(out)
    await _upsert_pipeline_step(db, case_id, "waiting_review", ai_result)

    return {
        "case_id": case_id,
        "status": "waiting_review",
        "ai_result": ai_result,
    }


# ============================================================
# PATCH /feature/1 — 담당자 수정
# ============================================================


class Feature1UpdateRequest(BaseModel):
    final_result: dict  # Feature1Result (types/pipeline.ts 약속)
    edit_reason: Optional[str] = None


@router.patch("/{case_id}/pipeline/feature/1")
async def update_feature1(
    case_id: str,
    body: Feature1UpdateRequest,
    db: asyncpg.Connection = Depends(get_conn_dep),
) -> dict:
    row = await _fetch_pipeline_step(db, case_id, "1")
    if not row:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "FEATURE1_NOT_RUN",
                "message": "먼저 /run 으로 기능1을 실행해주세요.",
                "feature": 1,
            },
        )
    await db.execute(
        """
        UPDATE pipeline_steps
           SET final_result = $2::jsonb,
               edit_reason  = $3,
               updated_at   = NOW()
         WHERE case_id = $1 AND step_key = '1'
        """,
        case_id,
        json.dumps(body.final_result, ensure_ascii=False),
        body.edit_reason,
    )
    return {"case_id": case_id, "updated": True}


# ============================================================
# POST /feature/1/confirm — 담당자 확인 완료
# ============================================================


@router.post("/{case_id}/pipeline/feature/1/confirm")
async def confirm_feature1(
    case_id: str, db: asyncpg.Connection = Depends(get_conn_dep)
) -> dict:
    row = await _fetch_pipeline_step(db, case_id, "1")
    if not row:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "FEATURE1_NOT_RUN",
                "message": "먼저 /run 으로 기능1을 실행해주세요.",
                "feature": 1,
            },
        )

    # final_result 가 없으면 ai_result 를 final_result 로 복사
    await db.execute(
        """
        UPDATE pipeline_steps
           SET status = 'completed',
               final_result = COALESCE(final_result, ai_result),
               updated_at = NOW()
         WHERE case_id = $1 AND step_key = '1'
        """,
        case_id,
    )
    return {"case_id": case_id, "status": "completed"}
