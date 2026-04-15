"""
검역 건(Case) 목록 조회 + 생성
GET  /api/v1/cases
POST /api/v1/cases
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.supabase_client import get_client

router = APIRouter(prefix="/cases", tags=["cases"])


class CaseCreate(BaseModel):
    title: str


@router.get("")
def list_cases():
    """검역 건 목록 조회 (최신순)"""
    try:
        res = (
            get_client()
            .table("cases")
            .select("id, product_name, importer_name, status, current_step, created_at")
            .order("created_at", desc=True)
            .execute()
        )
        return {"cases": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
def create_case(body: CaseCreate):
    """새 검역 건 생성"""
    try:
        res = (
            get_client()
            .table("cases")
            .insert({"product_name": body.title, "importer_name": "-", "status": "processing"})
            .execute()
        )
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
