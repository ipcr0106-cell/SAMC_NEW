"""
SAMC 백엔드 FastAPI 진입점

실행:
  cd backend
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin_laws, feature4

app = FastAPI(title="SAMC API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_laws.router)
app.include_router(feature4.router)


@app.get("/health")
def health():
    return {"status": "ok"}
