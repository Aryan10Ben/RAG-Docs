import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, health, upload

app = FastAPI(
    title="SourceLens API",
    description="Session-scoped document question answering with retrieval-backed answers.",
    version="1.1.0",
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "https://sourcelens-rag.vercel.app,https://rag-doc-q-a.netlify.app,http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Session-Id"],
)

app.include_router(health.router)
app.include_router(upload.router)
app.include_router(chat.router)
