"""Exercise the actual Vercel Functions + AI Gateway RAG pipeline.

Run with:
  pip install requests reportlab
  RAG_API_URL=https://your-preview.vercel.app python backend/tests/live_vercel_rag_smoke.py
"""

import io
import os
import sys
import time

import requests
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

BASE_URL = os.getenv("RAG_API_URL", "").rstrip("/")
FACT = "481726"
QUESTION = "What is the Silver Compass project's certification number?"


def make_pdf():
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle("SourceLens real end to end test")
    lines = [
        "SourceLens live end-to-end retrieval test.",
        "Silver Compass is a fictional research project.",
        "The certification number of the Silver Compass project is 481726.",
        "Its research cohort contained 73 participants.",
        "These facts are synthetic and safe to use for testing.",
    ]
    for i, line in enumerate(lines):
        pdf.drawString(52, 750 - 28 * i, line)
    pdf.save()
    return buffer.getvalue()


def main():
    if not BASE_URL.startswith("https://"):
        print("Missing HTTPS RAG_API_URL", file=sys.stderr)
        return 2
    print("Testing live Vercel RAG endpoint:", BASE_URL, flush=True)
    try:
        for path in ("/api/extract", "/api/index", "/api/ask"):
            resp = requests.get(BASE_URL + path, timeout=25)
            print("GET", path, resp.status_code, resp.text[:140], flush=True)
            resp.raise_for_status()

        start = time.monotonic()
        r1 = requests.post(BASE_URL + "/api/extract",
                           files={"file": ("silver-compass.pdf", make_pdf(), "application/pdf")},
                           timeout=65)
        print("PDF extraction:", r1.status_code, r1.text[:800], round(time.monotonic()-start, 2), flush=True)
        r1.raise_for_status()
        extracted = r1.json()
        chunks = extracted["chunks"]
        assert any(FACT in c["text"] for c in chunks), "PDF fact lost during parsing"

        start = time.monotonic()
        r2 = requests.post(BASE_URL + "/api/index", json={"chunks": chunks}, timeout=85)
        print("Vector indexing:", r2.status_code, r2.text[:450], round(time.monotonic()-start, 2), flush=True)
        r2.raise_for_status()
        indexed = r2.json()["indexed"]
        assert len(indexed) == len(chunks), "Index lost chunks"
        assert all(len(c["embedding"]) > 64 for c in indexed), "Embeddings missing"

        start = time.monotonic()
        r3 = requests.post(BASE_URL + "/api/ask", json={"question": QUESTION, "chunks": indexed}, timeout=85)
        print("Answer:", r3.status_code, r3.text[:1600], round(time.monotonic()-start, 2), flush=True)
        r3.raise_for_status()
        response = r3.json()
        assert FACT in response.get("answer", ""), "Answer did not contain the fact from PDF"
        assert response.get("sources"), "The AI answer has no supporting source passages"
        assert any(FACT in s.get("snippet", "") for s in response["sources"]), "Sources do not contain the actual fact"
        print("PASS: Hosted PDF -> text -> embeddings -> similarity -> LLM answer + evidence.", flush=True)
        return 0
    except Exception as exc:
        print("FAIL:", type(exc).__name__, str(exc)[:500], file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
