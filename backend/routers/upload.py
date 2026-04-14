"""
SAMC 수입식품 검역 AI — 파일 업로드 및 파싱 라우터

엔드포인트:
  POST /api/v1/cases/{case_id}/upload   → 파일 업로드
  POST /api/v1/cases/{case_id}/parse    → OCR + LLM 파싱 실행
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from db.supabase_client import get_supabase
from schemas.upload import (
    DocType,
    ErrorResponse,
    ParseResponse,
    ParseStatus,
    UploadResponse,
)
from services.ocr_service import extract_text_from_file
from services.parsing_service import parse_raw_texts_to_structured

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["upload"])

# ─────────────────────────────────────────────
# 상수
# ─────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/vnd.hancom.hwp",
    "application/vnd.hancom.hwpx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",  # HWP fallback
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

STORAGE_BUCKET = "documents"


# ─────────────────────────────────────────────
# POST /cases/{case_id}/upload
# ─────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
    },
    summary="서류 파일 업로드",
    description="검역 건에 필수 서류(원재료배합비율표, 제조공정도, MSDS, 라벨)를 업로드합니다.",
)
async def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    doc_type: DocType = Form(...),
):
    """파일을 받아 Supabase Storage에 저장하고 documents 테이블에 기록."""

    sb = get_supabase()

    # 1) case_id 유효성 확인
    case_check = sb.table("cases").select("id").eq("id", case_id).execute()
    if not case_check.data:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "CASE_NOT_FOUND",
                "message": "해당 건이 존재하지 않습니다.",
                "feature": 0,
            },
        )

    # 2) 파일 크기 검증
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "FILE_TOO_LARGE",
                "message": f"파일 크기가 {MAX_FILE_SIZE // (1024*1024)}MB를 초과합니다.",
                "feature": 0,
            },
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FILE_EMPTY",
                "message": "빈 파일은 업로드할 수 없습니다.",
                "feature": 0,
            },
        )

    # 3) MIME 타입 검증
    mime_type = file.content_type or "application/octet-stream"

    # 4) 저장 경로 생성
    doc_id = str(uuid.uuid4())
    file_ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    storage_path = f"cases/{case_id}/documents/{doc_id}.{file_ext}"

    # 5) Supabase Storage에 업로드
    try:
        sb.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": mime_type},
        )
    except Exception as e:
        logger.error(f"Storage 업로드 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "STORAGE_UPLOAD_FAILED",
                "message": f"파일 저장에 실패했습니다: {str(e)}",
                "feature": 0,
            },
        )

    # 6) documents 테이블에 레코드 삽입
    try:
        sb.table("documents").insert({
            "id": doc_id,
            "case_id": case_id,
            "doc_type": doc_type.value,
            "file_name": file.filename or "unknown",
            "storage_path": storage_path,
            "mime_type": mime_type,
        }).execute()
    except Exception as e:
        logger.error(f"documents 테이블 INSERT 실패: {e}")
        # Storage에 올라간 파일 정리 시도
        try:
            sb.storage.from_(STORAGE_BUCKET).remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail={
                "error": "DB_INSERT_FAILED",
                "message": f"문서 정보 저장에 실패했습니다: {str(e)}",
                "feature": 0,
            },
        )

    logger.info(f"파일 업로드 완료: case={case_id}, doc_type={doc_type.value}, file={file.filename}")

    return UploadResponse(
        doc_id=doc_id,
        file_name=file.filename or "unknown",
        storage_path=storage_path,
        doc_type=doc_type,
        mime_type=mime_type,
        created_at=datetime.now(timezone.utc),
    )


# ─────────────────────────────────────────────
# POST /cases/{case_id}/parse
# ─────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/parse",
    response_model=ParseResponse,
    responses={
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="업로드 서류 OCR + AI 파싱",
    description="해당 건의 모든 업로드 서류를 OCR로 텍스트 추출한 뒤, Claude AI로 구조화된 데이터를 생성합니다.",
)
async def parse_documents(case_id: str):
    """업로드된 서류를 OCR → LLM 파싱하여 구조화된 JSON을 반환."""

    sb = get_supabase()

    # 1) 건 존재 확인
    case_result = sb.table("cases").select("*").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "CASE_NOT_FOUND",
                "message": "해당 건이 존재하지 않습니다.",
            },
        )
    case_row = case_result.data[0]
    product_name_hint = case_row.get("product_name", "")

    # 2) 업로드된 문서 목록 조회
    docs_result = sb.table("documents").select("*").eq("case_id", case_id).execute()
    documents = docs_result.data or []

    if not documents:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "NO_DOCUMENTS",
                "message": "업로드된 서류가 없습니다. 먼저 파일을 업로드해주세요.",
                "feature": 0,
            },
        )

    # 3) doc_type별 OCR 텍스트 추출
    raw_texts: dict[str, str] = {}

    for doc in documents:
        doc_type = doc["doc_type"]
        file_name = doc["file_name"]
        mime_type = doc.get("mime_type", "application/octet-stream")
        storage_path = doc["storage_path"]

        # Supabase Storage에서 파일 다운로드
        try:
            file_bytes = sb.storage.from_(STORAGE_BUCKET).download(storage_path)
        except Exception as e:
            logger.warning(f"파일 다운로드 실패: {file_name} — {e}")
            continue

        if not file_bytes:
            logger.warning(f"파일 바이트 없음: {file_name}")
            continue

        text = await extract_text_from_file(file_bytes, file_name, mime_type)
        if text:
            # 같은 doc_type의 여러 파일이 있을 경우 텍스트 병합
            if doc_type in raw_texts:
                raw_texts[doc_type] += f"\n\n---\n\n{text}"
            else:
                raw_texts[doc_type] = text

    if not raw_texts:
        return ParseResponse(
            case_id=case_id,
            status=ParseStatus.ERROR,
            error_message="모든 서류의 텍스트 추출에 실패했습니다. 파일을 확인해주세요.",
        )

    # 4) Claude LLM 파싱
    parsed_result = await parse_raw_texts_to_structured(
        raw_texts=raw_texts,
        product_name_hint=product_name_hint,
    )

    # 5) 파싱 결과를 documents 테이블의 parsed_md에 저장
    for doc in documents:
        doc_type = doc["doc_type"]
        if doc_type in raw_texts:
            try:
                sb.table("documents") \
                    .update({"parsed_md": raw_texts[doc_type]}) \
                    .eq("id", doc["id"]).execute()
            except Exception as e:
                logger.warning(f"parsed_md 업데이트 실패: doc_id={doc['id']} — {e}")

    # 6) pipeline_steps에 AI 결과 저장 (step_key='0')
    try:
        sb.table("pipeline_steps").upsert({
            "case_id": case_id,
            "step_key": "0",
            "step_name": "입력 및 OCR 파싱",
            "status": "completed",
            "ai_result": parsed_result.model_dump(),
        }, on_conflict="case_id,step_key").execute()
    except Exception as e:
        logger.warning(f"pipeline_steps 저장 실패: {e}")

    # 7) cases 테이블의 current_step을 '0'(파싱 완료)으로 업데이트
    try:
        sb.table("cases") \
            .update({"current_step": "0"}) \
            .eq("id", case_id).execute()
    except Exception as e:
        logger.warning(f"cases current_step 업데이트 실패: {e}")

    logger.info(f"파싱 완료: case={case_id}, 성분 {len(parsed_result.ingredients)}개 추출")

    return ParseResponse(
        case_id=case_id,
        status=ParseStatus.COMPLETED,
        parsed_result=parsed_result,
        raw_texts=raw_texts,
        parsed_at=datetime.now(timezone.utc),
    )
