"""
기능 3 (수입 필요서류 안내) 독립 실행 엔트리.

단독 실행:
  uvicorn main:app --reload --port 8003

팀 파이프라인에 통합 시:
  from feature_3.routers import required_docs_router
  app.include_router(required_docs_router)
"""
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import required_docs_router  # noqa: E402


app = FastAPI(
    title="SAMC 기능 3 — 수입 필요서류 안내",
    description="식품유형·수출국·원재료·OEM·유기인증 정보를 받아 수입신고 시 제출·보관해야 하는 서류 목록을 반환합니다.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(required_docs_router)


@app.get("/health")
async def health() -> dict:
    """헬스체크 엔드포인트."""
    return {"status": "ok", "feature": 3}
