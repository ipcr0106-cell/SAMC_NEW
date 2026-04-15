"""
SAMC 수입식품 검역 AI 플랫폼 — FastAPI 메인 진입점

실행:
    cd backend && uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.upload import router as upload_router
from routers.cases import router as cases_router
from routers.feature4 import router as feature4_router
from routers.admin_laws import router as admin_laws_router

app = FastAPI(
    title="SAMC 수입식품 검역 AI",
    description="수입식품 검역 자동화 파이프라인 API",
    version="0.1.0",
)

# CORS — 프론트엔드(localhost:3000, Vercel 배포 URL) 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(upload_router)
app.include_router(cases_router)
app.include_router(feature4_router)      # F4: 수출국 표시사항 검토
app.include_router(admin_laws_router)    # F4: 법령 관리 어드민


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "service": "samc-backend"}
