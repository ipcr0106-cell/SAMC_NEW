"""
기능3 — 수입필요서류 안내

GET  /cases/{case_id}/pipeline/feature/3
  : feature2 결과의 food_type으로 f2_required_documents 조회 + pipeline_steps 저장

PATCH /cases/{case_id}/pipeline/feature/3
  : 담당자 확인 완료 처리
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env", override=True)

router = APIRouter(prefix="/cases", tags=["feature3-required-docs"])

STEP_KEY  = "A"
STEP_NAME = "required_docs"

_clients: dict = {}


def _get_clients() -> dict:
    if _clients:
        return _clients
    from supabase import create_client
    _clients["supabase"] = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )
    return _clients


class PatchFeature3Request(BaseModel):
    edit_reason: str = ""


@router.get("/{case_id}/pipeline/feature/3")
async def get_feature3(case_id: str):
    clients = _get_clients()
    sb      = clients["supabase"]

    f2 = (
        sb.table("pipeline_steps")
        .select("status, ai_result, final_result")
        .eq("case_id", case_id)
        .eq("step_key", "2")
        .single()
        .execute()
    )
    if not f2.data:
        raise HTTPException(
            status_code=400,
            detail="기능2(식품유형 분류)가 완료되지 않았습니다. 먼저 기능2를 실행하세요.",
        )

    f2_result  = f2.data.get("final_result") or f2.data.get("ai_result") or {}
    food_type  = f2_result.get("food_type", "")
    is_alcohol = f2_result.get("is_alcohol", False)

    if not food_type:
        raise HTTPException(status_code=400, detail="기능2 결과에 food_type이 없습니다.")

    existing = (
        sb.table("pipeline_steps")
        .select("*")
        .eq("case_id", case_id)
        .eq("step_key", STEP_KEY)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    specific = (
        sb.table("f2_required_documents")
        .select("doc_name, condition, is_mandatory, law_source, food_type")
        .eq("food_type", food_type)
        .execute()
    )
    common = (
        sb.table("f2_required_documents")
        .select("doc_name, condition, is_mandatory, law_source, food_type")
        .is_("food_type", "null")
        .execute()
    )

    alcohol_docs = []
    if is_alcohol:
        alc = (
            sb.table("f2_required_documents")
            .select("doc_name, condition, is_mandatory, law_source, food_type")
            .eq("food_type", "주류")
            .execute()
        )
        alcohol_docs = alc.data or []

    required_docs = (specific.data or []) + alcohol_docs + (common.data or [])

    seen: set = set()
    unique_docs = []
    for d in required_docs:
        if d["doc_name"] not in seen:
            seen.add(d["doc_name"])
            unique_docs.append(d)

    ai_result = {
        "food_type":     food_type,
        "is_alcohol":    is_alcohol,
        "required_docs": unique_docs,
    }

    upsert_res = (
        sb.table("pipeline_steps")
        .upsert(
            {
                "case_id":   case_id,
                "step_key":  STEP_KEY,
                "step_name": STEP_NAME,
                "status":    "waiting_review",
                "ai_result": ai_result,
            },
            on_conflict="case_id,step_key",
        )
        .execute()
    )

    return upsert_res.data[0] if upsert_res.data else {
        "case_id":   case_id,
        "step_key":  STEP_KEY,
        "status":    "waiting_review",
        "ai_result": ai_result,
    }


@router.patch("/{case_id}/pipeline/feature/3")
async def confirm_feature3(case_id: str, body: PatchFeature3Request):
    clients = _get_clients()
    sb      = clients["supabase"]

    existing = (
        sb.table("pipeline_steps")
        .select("id, ai_result")
        .eq("case_id", case_id)
        .eq("step_key", STEP_KEY)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="기능3 결과가 없습니다.")

    res = (
        sb.table("pipeline_steps")
        .update({
            "status":       "completed",
            "final_result": existing.data.get("ai_result"),
            "edit_reason":  body.edit_reason,
        })
        .eq("case_id", case_id)
        .eq("step_key", STEP_KEY)
        .execute()
    )
    return {"message": "확인 완료", "updated": res.data}
