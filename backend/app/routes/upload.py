from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from PyPDF2 import PdfReader

from app.services.chunker import chunk_text
from app.services.embeddings import add_document, clear_session

router = APIRouter(prefix="/files", tags=["Documents"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_PAGES = 120


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Header(..., alias="X-Session-Id", min_length=16, max_length=128),
):
    name = Path(file.filename or "").name
    if not name.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF documents are supported.")

    # Read one byte beyond the limit so oversized files can be rejected safely.
    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 10 MB limit.")
    if not payload.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="This file is not a valid PDF.")

    try:
        reader = PdfReader(BytesIO(payload))
        if reader.is_encrypted:
            raise HTTPException(status_code=422, detail="Password-protected PDFs are not supported.")
        if len(reader.pages) > MAX_PAGES:
            raise HTTPException(status_code=413, detail="PDF exceeds the 120-page limit.")
        chunks = []
        for page_number, page in enumerate(reader.pages, start=1):
            extracted = page.extract_text() or ""
            for chunk in chunk_text(extracted):
                chunks.append({"text": chunk, "page": page_number, "filename": name})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The PDF could not be read.") from exc

    if not chunks:
        raise HTTPException(status_code=422, detail="No extractable text found. Scanned PDFs need OCR, which is not enabled.")

    try:
        document_id = add_document(session_id, name, chunks)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc

    return {
        "status": "success",
        "document_id": document_id,
        "filename": name,
        "pages": len(reader.pages),
        "chunks_added": len(chunks),
    }


@router.delete("/session")
def delete_session(
    session_id: str = Header(..., alias="X-Session-Id", min_length=16, max_length=128),
):
    clear_session(session_id)
    return {"status": "deleted"}
