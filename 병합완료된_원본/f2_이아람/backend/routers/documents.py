"""
서류 업로드 + 파싱 라우터

POST /cases/{case_id}/documents            : 파일 업로드 + 텍스트 파싱 → documents 테이블 저장
GET  /cases/{case_id}/documents            : 업로드된 서류 목록 조회
DELETE /cases/{case_id}/documents/{doc_id} : 서류 삭제
"""

import io
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

load_dotenv(Path(__file__).parent.parent / ".env", override=True)

router = APIRouter(prefix="/cases", tags=["documents"])

ALLOWED_DOC_TYPES = {"ingredients", "process", "msds", "material", "other"}

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


def _parse_pdf(content: bytes) -> str:
    import pdfplumber
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n".join(text_parts)


def _parse_txt(content: bytes) -> str:
    for enc in ("utf-8", "cp949", "euc-kr"):
        try:
            return content.decode(enc)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


async def _call_parser_service(content: bytes, filename: str) -> str:
    import httpx
    url   = os.getenv("PARSER_SERVICE_URL", "http://localhost:3001")
    token = os.getenv("PARSER_SERVICE_TOKEN", "")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{url}/parse",
            files={"file": (filename, content)},
            headers={"Authorization": f"Bearer {token}"} if token else {},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"parser-service 오류: {resp.status_code}")
    data = resp.json()
    return data.get("markdown") or data.get("text") or ""


def _extract_text(content: bytes, filename: str) -> str | None:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _parse_pdf(content)
    if ext in (".txt", ".csv", ".md"):
        return _parse_txt(content)
    return None


@router.post("/{case_id}/documents")
async def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    doc_type: str    = Form("other"),
):
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"doc_type은 {list(ALLOWED_DOC_TYPES)} 중 하나여야 합니다.",
        )

    clients  = _get_clients()
    sb       = clients["supabase"]
    filename = file.filename or "unknown"
    content  = await file.read()
    ext      = Path(filename).suffix.lower()

    case = sb.table("cases").select("id").eq("id", case_id).single().execute()
    if not case.data:
        raise HTTPException(status_code=404, detail="케이스를 찾을 수 없습니다.")

    parsed_md: str | None = None
    parse_error = None
    try:
        if ext in (".hwp", ".hwpx"):
            parsed_md = await _call_parser_service(content, filename)
        else:
            parsed_md = _extract_text(content, filename)
    except Exception as e:
        parsed_md   = None
        parse_error = str(e)

    storage_path = f"uploads/{case_id}/{filename}"
    row = {
        "case_id":      case_id,
        "doc_type":     doc_type,
        "file_name":    filename,
        "storage_path": storage_path,
        "mime_type":    file.content_type,
        "parsed_md":    parsed_md,
        "is_verified":  False,
    }
    result = sb.table("documents").insert(row).execute()
    doc = result.data[0] if result.data else {}

    return {
        "doc_id":       doc.get("id"),
        "file_name":    filename,
        "doc_type":     doc_type,
        "parsed":       parsed_md is not None,
        "parse_error":  parse_error,
        "storage_path": storage_path,
    }


@router.get("/{case_id}/documents")
async def list_documents(case_id: str):
    clients = _get_clients()
    sb      = clients["supabase"]

    res = (
        sb.table("documents")
        .select("id, doc_type, file_name, is_verified, parsed_md, created_at")
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
    )
    docs = res.data or []

    for d in docs:
        md = d.pop("parsed_md", None)
        d["parsed"]        = md is not None
        d["parsed_length"] = len(md) if md else 0

    return {"documents": docs}


@router.delete("/{case_id}/documents/{doc_id}")
async def delete_document(case_id: str, doc_id: str):
    clients = _get_clients()
    sb      = clients["supabase"]
    sb.table("documents").delete().eq("id", doc_id).eq("case_id", case_id).execute()
    return {"message": "삭제 완료"}
