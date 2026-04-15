"""
기능 3 FastAPI 라우터.

엔드포인트:
  POST /api/v1/required-docs          — 서류 매칭 + 근거
  POST /api/v1/required-docs/rag      — 법령 본문 시맨틱 검색 (선택)
  POST /api/v1/required-docs/reload   — 캐시 리로드 (법령 개정 반영용)
"""
from fastapi import APIRouter, HTTPException

from db.supabase_client import reload_cache
from models.schemas import ProductInfo, RequiredDocsResponse
from rag.pinecone_client import search_law_chunks
from services.step_a_required_docs import match_required_docs


router = APIRouter(prefix="/api/v1/required-docs", tags=["feature-3"])


@router.post("", response_model=RequiredDocsResponse)
async def get_required_docs(info: ProductInfo) -> RequiredDocsResponse:
    """제품 정보 기반 필요 서류 매칭.

    필수 입력: food_type, origin_country
    권장 입력: category, product_keywords, is_oem, has_organic_cert
    """
    if not info.food_type or not info.origin_country:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INSUFFICIENT_INPUT",
                "message": "식품유형과 수출국 정보가 필요합니다. 이전 단계(기능 1·2) 결과를 확인하세요.",
                "feature": 3,
            },
        )
    return match_required_docs(info)


@router.post("/rag")
async def search_law_context(payload: dict) -> list[dict]:
    """법령 청크 시맨틱 검색 (AI 교차검증·설명 생성용).

    Request body:
      {
        "query": "ASF 발생국 돼지 원료 서류",
        "top_k": 5,
        "filter_doc_ids": ["g6-6"]   // 선택
      }
    """
    query = (payload or {}).get("query", "").strip()
    if not query:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "QUERY_REQUIRED",
                "message": "query 파라미터가 필요합니다.",
                "feature": 3,
            },
        )
    return search_law_chunks(
        query=query,
        top_k=int((payload or {}).get("top_k", 5)),
        filter_doc_ids=(payload or {}).get("filter_doc_ids"),
    )


@router.post("/reload")
async def reload_data_cache() -> dict:
    """Supabase 데이터 캐시 리로드 (법령 개정 반영).

    운영자 전용: 데이터 변경 후 재시작 없이 반영하고 싶을 때 호출.
    """
    reload_cache()
    return {"status": "reloaded", "feature": 3}
