"""
PDF 업로드 → Claude 멀티모달 파싱 → documents 테이블 저장
POST /api/v1/cases/{case_id}/upload
GET  /api/v1/cases/{case_id}/upload
"""

import os
import base64

import anthropic
from fastapi import APIRouter, File, HTTPException, UploadFile
from dotenv import load_dotenv

from db.supabase_client import get_client

load_dotenv()

router = APIRouter(prefix="/cases/{case_id}", tags=["upload"])

PARSE_PROMPT = """이 PDF는 수입식품의 성분표 또는 관련 서류입니다.
문서의 모든 내용을 마크다운 형식으로 정확하게 추출해주세요.
표는 마크다운 테이블로, 목록은 - 형식으로, 수치와 단위는 그대로 유지해주세요."""


def _parse_pdf_with_claude(pdf_bytes: bytes) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": b64,
                        },
                    },
                    {"type": "text", "text": PARSE_PROMPT},
                ],
            }
        ],
    )
    return message.content[0].text


@router.post("/upload", status_code=201)
async def upload_document(case_id: str, file: UploadFile = File(...)):
    """PDF 업로드 → Claude 파싱 → documents 테이블 저장"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    pdf_bytes = await file.read()

    try:
        parsed_md = _parse_pdf_with_claude(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude 파싱 실패: {e}")

    try:
        res = (
            get_client()
            .table("documents")
            .insert(
                {
                    "case_id": case_id,
                    "doc_type": "ingredients",
                    "file_name": file.filename,
                    "storage_path": f"cases/{case_id}/{file.filename}",
                    "mime_type": "application/pdf",
                    "parsed_md": parsed_md,
                }
            )
            .execute()
        )
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upload")
def list_documents(case_id: str):
    """업로드된 문서 목록 조회"""
    try:
        res = (
            get_client()
            .table("documents")
            .select("id, doc_type, file_name, is_verified, created_at")
            .eq("case_id", case_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"documents": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
