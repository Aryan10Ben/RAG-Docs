from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/")
def root():
    return {"service": "sourcelens-api", "status": "ok"}


@router.get("/health")
def health():
    return {"service": "sourcelens-api", "status": "ok", "version": "1.1.0"}
