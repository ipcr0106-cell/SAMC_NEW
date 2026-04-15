"""
기능5 한글표시사항 시안 생성 / 조회 / 확정
POST  /api/v1/cases/{case_id}/pipeline/feature/5/run
GET   /api/v1/cases/{case_id}/pipeline/feature/5
PATCH /api/v1/cases/{case_id}/pipeline/feature/5
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from db.supabase_client import get_client
from services.step6_label import generate_label, generate_label_stream

router = APIRouter(prefix="/cases/{case_id}/pipeline/feature/5", tags=["pipeline"])

STEP_KEY = "6"
STEP_NAME = "한글표시사항"


class RunRequest(BaseModel):
    food_type: Optional[str] = None   # 없으면 AI가 서류에서 파악
    draft_label: Optional[str] = None # 한글 가안 (없으면 AI 자동 생성)
    stream: bool = False


class ConfirmRequest(BaseModel):
    confirmed_by: str


def _get_documents(case_id: str) -> list:
    res = (
        get_client()
        .table("documents")
        .select("parsed_md, file_name")
        .eq("case_id", case_id)
        .execute()
    )
    return res.data or []


@router.post("/run")
def run_pipeline(case_id: str, body: RunRequest):
    """한글표시사항 시안 생성 (stream=true 면 SSE 스트리밍)"""
    docs = _get_documents(case_id)
    if not docs:
        raise HTTPException(status_code=400, detail="업로드된 PDF가 없습니다.")

    # pipeline_steps upsert — running 상태로 전환
    try:
        get_client().table("pipeline_steps").upsert(
            {
                "case_id": case_id,
                "step_key": STEP_KEY,
                "step_name": STEP_NAME,
                "status": "running",
            },
            on_conflict="case_id,step_key",
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if body.stream:
        return StreamingResponse(
            generate_label_stream(
                case_id=case_id,
                documents=docs,
                food_type=body.food_type,
                draft_label=body.draft_label,
            ),
            media_type="text/event-stream",
        )

    # 비스트리밍
    try:
        result = generate_label(
            case_id=case_id,
            documents=docs,
            food_type=body.food_type,
            draft_label=body.draft_label,
        )
    except Exception as e:
        get_client().table("pipeline_steps").upsert(
            {"case_id": case_id, "step_key": STEP_KEY, "status": "error"},
            on_conflict="case_id,step_key",
        ).execute()
        raise HTTPException(status_code=502, detail=str(e))

    # 결과 저장
    try:
        get_client().table("pipeline_steps").upsert(
            {
                "case_id": case_id,
                "step_key": STEP_KEY,
                "step_name": STEP_NAME,
                "status": "waiting_review",
                "ai_result": result,
            },
            on_conflict="case_id,step_key",
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


@router.get("")
def get_label(case_id: str):
    """최신 시안 조회"""
    try:
        res = (
            get_client()
            .table("pipeline_steps")
            .select("*")
            .eq("case_id", case_id)
            .eq("step_key", STEP_KEY)
            .single()
            .execute()
        )
        return res.data
    except Exception:
        raise HTTPException(status_code=404, detail="시안이 없습니다. 먼저 생성해주세요.")


@router.patch("")
def confirm_label(case_id: str, body: ConfirmRequest):
    """담당자 최종 확정"""
    try:
        # 현재 ai_result를 final_result로 복사 + 확정자 기록
        step = (
            get_client()
            .table("pipeline_steps")
            .select("ai_result")
            .eq("case_id", case_id)
            .eq("step_key", STEP_KEY)
            .single()
            .execute()
        )
        ai_result = step.data.get("ai_result") if step.data else {}

        res = (
            get_client()
            .table("pipeline_steps")
            .upsert(
                {
                    "case_id": case_id,
                    "step_key": STEP_KEY,
                    "step_name": STEP_NAME,
                    "status": "completed",
                    "final_result": {**(ai_result or {}), "confirmed_by": body.confirmed_by},
                },
                on_conflict="case_id,step_key",
            )
            .execute()
        )
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
