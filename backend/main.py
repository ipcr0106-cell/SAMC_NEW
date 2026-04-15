from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, feature2, feature3

app = FastAPI(title="SAMC API", description="수입식품 검역 AI 플랫폼 백엔드", version="1.0")

# CORS 설정 (프론트엔드 연동 시 발생하는 에러 방지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용으로 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(feature2.router)
app.include_router(feature3.router)

@app.get("/")
def read_root():
    return {"message": "SAMC 백엔드 서버가 정상적으로 실행 중입니다!"}