"""
SAMC 수입식품 검역 AI — 기능5 한글표시사항
FastAPI 앱 진입점
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import cases, upload, pipeline

app = FastAPI(
    title="SAMC 한글표시사항 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — 로컬 개발(3000) + Vercel 배포 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(cases.router,    prefix="/api/v1")
app.include_router(upload.router,   prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
