# SourceLens — Legacy Python Semantic RAG Backend

[Main project README](../README.md) · [Active Vercel architecture](../docs/VERCEL_RAG.md) · [Interview guide](../docs/INTERVIEW_GUIDE.md)

> [!WARNING]
> **This directory is a separate, legacy/experimental backend. It is NOT the API used by the public SourceLens Vercel website.** The live site uses `frontend/api/` for PDF extraction, hashed lexical-vector retrieval, and extractive answers. Do not assume this heavy Python stack is deployed or that Groq-backed generation has been verified online.

## Why this backend is retained

It contains a fuller **semantic retrieval-augmented generation** implementation useful for learning and interviews:

```text
PDF -> PyPDF2 -> overlapping word chunks
                   |
                   v
    SentenceTransformers all-MiniLM-L6-v2
                   |
                   v
       normalized 384-d embeddings
                   |
                   v
       FAISS IndexFlatIP / session
                   |
Question -> same encoder -> top-4 retrieval
                   |
                   v
     Groq-hosted language model
                   |
                   v
          answer + source pages
```

### Stack

| Component | Implementation |
| --- | --- |
| REST API | Python / FastAPI |
| PDF parsing | PyPDF2 |
| Chunking | Overlapping word windows, 400 words / 50 overlap by default |
| Encoder | `all-MiniLM-L6-v2`, 384-dimensional normalized embeddings |
| Retrieval | FAISS inner product (cosine over normalized vectors) |
| Generation | Groq API, requires `GROQ_API_KEY` |
| Session index | Process-local, in-memory, token-keyed session dictionaries |

The API provides `GET /health`, `POST /files/upload`, `POST /chat/ask`, and `DELETE /files/session`. The upload and chat endpoints require an `X-Session-Id` header (16–128 characters). A random session token is **not authentication**.

## Local setup

Requires a Python environment capable of installing PyTorch, SentenceTransformers and FAISS. The first embedding request may download a pretrained model.

```bash
cd backend
python -m venv .venv
# Activate the environment for your OS
python -m pip install -r requirements.txt
# Set GROQ_API_KEY securely in your terminal/runtime environment.
uvicorn app.main:app --reload --port 8000
```

The sample configuration in [`.env.example`](.env.example) is a template; the application reads real environment variables directly. Merely copying the file does **not** automatically load them.

Try `http://localhost:8000/docs` for the OpenAPI interface.

## Backend API and limitations

- **Upload:** PDF only, up to **10 MiB** and **120 pages**, with selectable text.
- **Retrieval:** session-scoped in-memory FAISS; 200 chunks maximum per session, up to 60 active sessions, roughly two-hour inactive expiry.
- **Generation:** Groq API key and valid/available `GROQ_MODEL` are required to produce LLM answers.
- **No OCR:** image-only and encrypted PDFs are rejected.
- **Not multi-instance durable:** processes do not share indices; restarts lose state.
- **Not private SaaS:** no authenticated ownership checks, quotas, malware scanning or durable deletion guarantees.

The older Render URL became unresponsive in live integration tests; see [the historical incident report](../docs/LIVE_VERIFICATION.md). The present Vercel production application was intentionally moved away from this dependency.

## Tests

From the repository root:

```bash
python -m pip install fastapi uvicorn python-multipart PyPDF2 httpx pytest
PYTHONPATH=backend python -m pytest -q backend/tests
```

The lightweight unit/API suite validates contracts and selected stubs, **not** a live Groq answer from this backend. A full semantic-RAG smoke test requires running this service, providing a real key, and verifying retrieval against known PDF passages.

## When to use which implementation

| Goal | Use |
| --- | --- |
| Try the public deployed SourceLens app | [Vercel demo](https://sourcelens-rag.vercel.app) |
| Understand and run semantic retrieval + FAISS locally | This `backend/` package |
| Learn exactly what was shipped, with honest resume claims | [Interview guide](../docs/INTERVIEW_GUIDE.md) |

### Attribution

The repository builds on a prior collaborative, MIT-licensed implementation. Respect the original copyright in [LICENSE](../LICENSE) and distinguish prior work from later contributions in interviews.
