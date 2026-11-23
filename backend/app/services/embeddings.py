"""In-memory, session-scoped vector search for a small educational demo.

For a production multi-instance service, replace this with a persistent vector
database and authenticated, user-scoped access control.
"""

import threading
import time
from uuid import uuid4

_DIMENSION = 384
_MAX_SESSION_CHUNKS = 200
_MAX_SESSIONS = 60
_SESSION_TTL_SECONDS = 60 * 60 * 2

_lock = threading.RLock()
_sessions = {}
_encoder = None


def _get_encoder():
    global _encoder
    with _lock:
        if _encoder is None:
            from sentence_transformers import SentenceTransformer
            _encoder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        return _encoder


def _embed(texts):
    import numpy as np

    vectors = _get_encoder().encode(
        texts, convert_to_numpy=True, normalize_embeddings=True
    )
    return np.asarray(vectors, dtype="float32")


def _prune(now):
    expired = [
        key for key, state in _sessions.items()
        if now - state["touched"] > _SESSION_TTL_SECONDS
    ]
    for key in expired:
        del _sessions[key]


def add_document(session_id, filename, chunks):
    """Index page-aware chunks. A session cannot read another session's index."""
    if not chunks or len(chunks) > _MAX_SESSION_CHUNKS:
        raise ValueError("Document has too many text chunks for this demo.")

    vectors = _embed([item["text"] for item in chunks])
    with _lock:
        now = time.monotonic()
        _prune(now)
        state = _sessions.get(session_id)
        prior = len(state["chunks"]) if state else 0
        if prior + len(chunks) > _MAX_SESSION_CHUNKS:
            raise ValueError("Session reached the 200-chunk limit. Start a new browser session.")

        if state is None:
            import faiss
            if len(_sessions) >= _MAX_SESSIONS:
                oldest = min(_sessions, key=lambda key: _sessions[key]["touched"])
                del _sessions[oldest]
            state = {"index": faiss.IndexFlatIP(_DIMENSION), "chunks": [], "touched": now}
            _sessions[session_id] = state

        document_id = uuid4().hex
        metadata = [
            {
                "document_id": document_id,
                "filename": filename,
                "page": item["page"],
                "text": item["text"],
            }
            for item in chunks
        ]
        state["index"].add(vectors)
        state["chunks"].extend(metadata)
        state["touched"] = now
        return document_id


def search(session_id, question, k=4):
    with _lock:
        now = time.monotonic()
        _prune(now)
        state = _sessions.get(session_id)
        if state is None or state["index"].ntotal == 0:
            return []

    vector = _embed([question])
    with _lock:
        state = _sessions.get(session_id)
        if state is None:
            return []
        distances, positions = state["index"].search(
            vector, min(k, state["index"].ntotal)
        )
        state["touched"] = time.monotonic()
        results = []
        for score, index in zip(distances[0], positions[0]):
            if index < 0 or float(score) < 0.18:
                continue
            source = state["chunks"][int(index)].copy()
            source["score"] = round(float(score), 3)
            results.append(source)
        return results


def clear_session(session_id):
    with _lock:
        _sessions.pop(session_id, None)
