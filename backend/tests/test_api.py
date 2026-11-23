import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
SESSION = {"X-Session-Id": "test-session-0123456789abcdef"}


def test_root_and_health():
    assert client.get("/").status_code == 200
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["version"] == "1.1.0"


def test_question_requires_session():
    response = client.post("/chat/ask", json={"question": "What is RAG?"})
    assert response.status_code == 422


def test_question_requires_nonempty_text():
    response = client.post("/chat/ask", headers=SESSION, json={"question": "  "})
    assert response.status_code == 422


def test_chat_returns_answer_and_evidence(monkeypatch):
    def fake_answer(session_id, question):
        assert session_id == SESSION["X-Session-Id"]
        assert question == "Summarize this document."
        return {
            "answer": "The document discusses retrieval.",
            "sources": [{"filename": "notes.pdf", "page": 2, "snippet": "retrieval", "score": 0.82}],
        }

    monkeypatch.setattr("app.routes.chat.generate_answer", fake_answer)
    response = client.post(
        "/chat/ask",
        headers=SESSION,
        json={"question": "Summarize this document."},
    )
    assert response.status_code == 200
    assert response.json()["sources"][0]["page"] == 2


def test_upload_rejects_unsupported_file():
    response = client.post(
        "/files/upload",
        headers=SESSION,
        files={"file": ("recording.mp3", b"audio", "audio/mpeg")},
    )
    assert response.status_code == 415


def test_upload_rejects_fake_pdf():
    response = client.post(
        "/files/upload",
        headers=SESSION,
        files={"file": ("fake.pdf", b"not-a-pdf", "application/pdf")},
    )
    assert response.status_code == 422


def test_upload_requires_session():
    response = client.post(
        "/files/upload",
        files={"file": ("document.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert response.status_code == 422


def test_cors_allowed_origin():
    response = client.options(
        "/files/upload",
        headers={
            "Origin": "https://sourcelens-rag.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-session-id",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://sourcelens-rag.vercel.app"
