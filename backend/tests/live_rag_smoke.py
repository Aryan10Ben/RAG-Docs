"""Live end-to-end diagnostic against the deployed SourceLens API.

Usage:
    pip install requests reportlab
    RAG_API_URL=https://rag-doc-q-a.onrender.com python backend/tests/live_rag_smoke.py

Uses a synthetic, non-sensitive PDF with a unique answer. This is not a mock test.
"""

import io
import os
import sys
import time
import uuid

import requests
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

BASE_URL = os.environ.get("RAG_API_URL", "https://rag-doc-q-a.onrender.com").rstrip("/")
MAGIC_NUMBER = "481726"
DOCUMENT_NAME = "sourcelens-e2e-check.pdf"
QUESTION = "What is the certification number of the Silver Compass project?"


def make_test_pdf():
    stream = io.BytesIO()
    doc = canvas.Canvas(stream, pagesize=letter)
    doc.setTitle("SourceLens harmless RAG integration test")
    lines = [
        "SourceLens Live RAG Integration Test",
        "The internal test project is called Silver Compass.",
        f"The certification number of Silver Compass is {MAGIC_NUMBER}.",
        "The measured sample size was 73.",
        "This PDF contains fabricated test facts, not personal information.",
        "This document is for verifying real document retrieval and question answering.",
    ]
    y = 720
    for line in lines:
        doc.drawString(55, y, line)
        y -= 30
    doc.save()
    return stream.getvalue()


def main():
    print(f"Target API: {BASE_URL}", flush=True)
    print("Test: POST one fabricated PDF then POST one factual question.", flush=True)
    session_id = "smoke-" + str(uuid.uuid4())
    headers = {"X-Session-Id": session_id}
    try:
        # Warm free-tier instances. Health may not exist on legacy deployments.
        for path in ("/health", "/"):
            try:
                resp = requests.get(BASE_URL + path, timeout=45)
                print(f"Warm-up GET {path}: HTTP {resp.status_code}", flush=True)
                if resp.ok:
                    break
            except requests.RequestException as exc:
                print(f"Warm-up {path} failed: {type(exc).__name__}: {str(exc)[:160]}", flush=True)
        started = time.monotonic()
        upload = requests.post(
            BASE_URL + "/files/upload",
            headers=headers,
            files={"file": (DOCUMENT_NAME, make_test_pdf(), "application/pdf")},
            timeout=210,
        )
        print(f"Upload HTTP {upload.status_code}, {time.monotonic() - started:.1f}s", flush=True)
        print("Upload response: " + upload.text[:1100], flush=True)
        upload.raise_for_status()
        try:
            result = upload.json()
            if result.get("status") not in ("success", None):
                raise AssertionError(f"Unexpected upload status: {result['status']!r}")
        except ValueError as exc:
            raise AssertionError("Upload returned invalid JSON") from exc

        started = time.monotonic()
        reply = requests.post(
            BASE_URL + "/chat/ask",
            headers={**headers, "Content-Type": "application/json"},
            json={"question": QUESTION},
            timeout=140,
        )
        print(f"Ask HTTP {reply.status_code}, {time.monotonic() - started:.1f}s", flush=True)
        print("Ask response: " + reply.text[:1800], flush=True)
        reply.raise_for_status()
        data = reply.json()
        answer = data.get("answer", "")
        if not isinstance(answer, str) or MAGIC_NUMBER not in answer:
            raise AssertionError("Answer did not contain the known PDF fact " + MAGIC_NUMBER)
        sources = data.get("sources")
        if isinstance(sources, list) and sources:
            print(f"Returned {len(sources)} evidence passage(s).", flush=True)
            if not any(
                MAGIC_NUMBER in str(source.get("snippet", ""))
                for source in sources if isinstance(source, dict)
            ):
                print("WARNING: evidence snippets did not contain the known answer.", flush=True)
        else:
            print("WARNING: No structured source passages; grounding cannot be independently confirmed.", flush=True)

        print("PASS: Live PDF upload and grounded factual Q&A succeeded.", flush=True)
        return 0
    except (requests.RequestException, AssertionError, ValueError) as exc:
        print(f"FAIL: {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
