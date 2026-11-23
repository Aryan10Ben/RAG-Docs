"""Fast, deterministic unit tests for session ownership (no model downloads)."""

import sys
from types import SimpleNamespace

import pytest

from app.services import embeddings


class FakeIndexFlatIP:
    def __init__(self, dimension):
        self.dimension = dimension
        self.vectors = []

    @property
    def ntotal(self):
        return len(self.vectors)

    def add(self, vectors):
        self.vectors.extend(vectors)

    def search(self, queries, k):
        query = queries[0]
        scores = [
            sum(a * b for a, b in zip(query, vector))
            for vector in self.vectors
        ]
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
        return [[scores[i] for i in ranked]], [ranked]


@pytest.fixture(autouse=True)
def isolated_store(monkeypatch):
    def fake_embeddings(texts):
        result = []
        for text in texts:
            text = text.lower()
            first, second = (1.0, 0.0) if "apple" in text else (0.0, 1.0)
            result.append([first, second] + [0.0] * 382)
        return result

    monkeypatch.setitem(sys.modules, "faiss", SimpleNamespace(IndexFlatIP=FakeIndexFlatIP))
    monkeypatch.setattr(embeddings, "_embed", fake_embeddings)
    embeddings._sessions.clear()
    yield
    embeddings._sessions.clear()


def test_sessions_do_not_share_documents():
    first_id = embeddings.add_document(
        "session-A", "apples.pdf",
        [{"text": "Apple facts", "filename": "apples.pdf", "page": 1}],
    )
    second_id = embeddings.add_document(
        "session-B", "bananas.pdf",
        [{"text": "Banana facts", "filename": "bananas.pdf", "page": 3}],
    )

    a = embeddings.search("session-A", "apple")
    b = embeddings.search("session-B", "banana")

    assert a[0]["filename"] == "apples.pdf"
    assert b[0]["filename"] == "bananas.pdf"
    assert a[0]["document_id"] == first_id
    assert b[0]["document_id"] == second_id
    assert embeddings.search("session-C", "apple") == []


def test_clear_session_removes_its_documents_only():
    chunk = [{"text": "Apple facts", "filename": "notes.pdf", "page": 2}]
    embeddings.add_document("session-A", "notes.pdf", chunk)
    embeddings.add_document("session-B", "notes.pdf", chunk)
    embeddings.clear_session("session-A")
    assert embeddings.search("session-A", "apple") == []
    assert len(embeddings.search("session-B", "apple")) == 1


def test_reject_excessive_chunks():
    chunk = {"text": "Apple facts", "filename": "notes.pdf", "page": 1}
    with pytest.raises(ValueError, match="too many"):
        embeddings.add_document("session-A", "notes.pdf", [chunk] * 201)
