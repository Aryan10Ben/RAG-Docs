"""SourceLens PDF extraction on Vercel: bounded, text-based PDFs only.

Vercel Functions have a 4.5 MB request/response limit. We cap PDFs at
3.5 MB and extracted chunks at 60 to leave headroom for framing.
"""
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from PyPDF2 import PdfReader

app = FastAPI(title="SourceLens PDF extractor")

MAX_PDF_BYTES = 3_500_000
MAX_PAGES = 80
MAX_CHUNKS = 60
CHUNK_LENGTH = 920
CHUNK_OVERLAP = 140


def split_text(text: str):
    """Overlap chunks to avoid breaking a fact across a retrieval boundary."""
    normal = " ".join(text.split())
    if not normal:
        return []
    if len(normal) <= CHUNK_LENGTH:
        return [normal]
    chunks = []
    start = 0
    while start < len(normal):
        end = min(start + CHUNK_LENGTH, len(normal))
        if end < len(normal):
            # Split on a word boundary without sacrificing most of the chunk.
            boundary = normal.rfind(" ", start + CHUNK_LENGTH // 2, end)
            if boundary > start:
                end = boundary
        piece = normal[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(normal):
            break
        start = max(start + 1, end - CHUNK_OVERLAP)
    return chunks


@app.get("/api/extract")
@app.get("/")
def health():
    return {"status": "ok", "service": "sourcelens-extract"}


@app.post("/api/extract")
@app.post("/")
async def extract_pdf(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name[:160]
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Please choose a PDF file.")
    payload = await file.read(MAX_PDF_BYTES + 1)
    await file.close()
    if not payload:
        raise HTTPException(status_code=422, detail="The uploaded PDF is empty.")
    if len(payload) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF too large for Vercel. Limit: 3.5 MB.")
    if not payload.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="The file does not appear to be a PDF.")

    try:
        pdf = PdfReader(BytesIO(payload))
        if pdf.is_encrypted:
            raise HTTPException(status_code=422, detail="Password-protected PDFs are not supported.")
        if len(pdf.pages) > MAX_PAGES:
            raise HTTPException(status_code=413, detail="Please upload a PDF with 80 pages or fewer.")
        chunks = []
        for number, page in enumerate(pdf.pages, start=1):
            for snippet in split_text(page.extract_text() or ""):
                if len(snippet) < 20:
                    continue
                chunks.append({"text": snippet, "page": number, "filename": filename})
                if len(chunks) > MAX_CHUNKS:
                    raise HTTPException(status_code=413, detail="Too much text for this demo (maximum 60 chunks). Try a shorter PDF.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Unable to read the PDF. Please try a text-based PDF.") from exc

    if not chunks:
        raise HTTPException(status_code=422, detail="No selectable text found. Scanned PDFs require OCR.")
    return {"status": "success", "filename": filename, "pages": len(pdf.pages), "chunks": chunks}
