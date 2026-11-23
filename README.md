# SourceLens — Ask Questions Across Your Documents

**SourceLens** is a document-intelligence workspace built around retrieval-augmented generation (RAG). It extracts text from a PDF, splits it into chunks, embeds the chunks, retrieves semantically similar passages for a question, and asks a language model to answer from those passages.

[**Live React frontend**](https://sourcelens-rag.vercel.app) · [**API source**](backend/app) · [**Interview walkthrough**](docs/INTERVIEW_GUIDE.md)

> **Demo status:** The React frontend is deployed on Vercel. The Python API is a separate service and must be deployed on a Python/container host (for example, Render). New server features are active only after the backend is redeployed. This is an educational demo **without authentication or durable storage**. Do not upload confidential documents.

## Features

| Capability | Implementation |
| --- | --- |
| PDF upload | File type, signature, size (10 MB), and page-count (120) validation |
| Semantic retrieval | SentenceTransformers `all-MiniLM-L6-v2` embeddings + FAISS cosine similarity |
| Answers | Groq API using `llama-3.1-8b-instant`, restricted to retrieved passages |
| Evidence | Retrieved filename, page number, similarity score, and source snippet |
| Session separation | Random browser session ID with an in-memory vector index per session |
| Workspace UX | Drag/drop, upload state, suggested prompts, chat history, copy answer, responsive layout |
| Engineering | FastAPI validation, React lint/build, pytest API contract checks, GitHub CI |

**Supported format:** Text-based PDFs. Scanned PDFs require OCR and are not supported yet. Audio/video transcription is *not* available; the previous interface overstated this capability.

## Architecture

```text
Browser (React / Vite)                    Vercel (static frontend)
    |   X-Session-Id                         |
    +--------------> FastAPI (Python host) <--+
                           |
                      PDF extraction
                           |
                Page-aware word chunks
                           |
             SentenceTransformers embeddings
                           |
                 FAISS index per session
                           |
             Question -> top-k retrieval
                           |
                 Groq LLM with context
                           |
             Answer + retrieved passages
```

The browser sends a random session ID on each request. The backend maintains an **in-memory** FAISS index scoped to that ID. The embedding model is loaded lazily. No files are written to disk by the revised upload route.

### Project layout

```text
frontend/
  src/App.jsx              # Workflow state and component composition
  src/components/          # Sidebar, upload, questions, results
  src/api/documents.js     # Fetch, timeout, response/error handling
  src/lib/session.js       # Anonymous browser session identifier
  src/App.css              # Responsive application styling
  public/favicon.svg
backend/
  app/main.py              # FastAPI application and CORS
  app/routes/              # Health, upload, and chat endpoints
  app/services/chunker.py  # Text chunking
  app/services/embeddings.py # Session-scoped FAISS retrieval
  app/services/llm.py      # Retrieved context and Groq answer
  tests/                   # API contract tests
docs/
  INTERVIEW_GUIDE.md       # Explanations, trade-offs, evaluation plan
.github/workflows/ci.yml   # React build/lint and backend pytest
docker-compose.yml         # Container-based backend development
```

## Run locally

### 1. Start the backend

Requires Python 3.11+ and a Groq API key. The first request may download the embedding model and take time to load.

```bash
cd backend
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Set GROQ_API_KEY in your shell / runtime environment
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for OpenAPI documentation and `http://localhost:8000/health` for health status.

### 2. Start the frontend

```bash
cd frontend
npm ci
# Put VITE_API_BASE_URL=http://localhost:8000 in frontend/.env.local
npm run dev
```

Open the printed Vite URL, normally `http://localhost:5173`.

### 3. Run checks

```bash
cd frontend && npm run lint && npm run build
# In the repository root (with test dependencies installed):
PYTHONPATH=backend python -m pytest -q backend/tests
```

### API

| Endpoint | Method | Description |
| --- | --- | --- |
| `/health` | GET | Lightweight health check |
| `/files/upload` | POST | Multipart `file` + `X-Session-Id` header |
| `/chat/ask` | POST | JSON `{"question": "..." }` + `X-Session-Id` header |
| `/files/session` | DELETE | Clears the current session's indexed documents |

A chat response has this shape:

```json
{
  "answer": "Answer based on uploaded content...",
  "sources": [
    { "filename": "notes.pdf", "page": 2, "snippet": "Retrieved passage", "score": 0.81 }
  ]
}
```

Source scores are **similarity scores, not confidence probabilities**. Source snippets represent retrieval evidence; the LLM's individual claims are not independently verified.

## Deployment

- **Frontend:** Vercel project `sourcelens-rag`, GitHub `Aryan10Ben/RAG-Docs`, root directory `frontend`, framework Vite, build `npm run build`, output `dist`. Pushes to `main` deploy production; feature branches get previews.
- **Backend:** A persistent Python/container hosting service (for example, Render). Deploy `backend/` using its Dockerfile and provide `GROQ_API_KEY` as a secret. Set `CORS_ORIGINS` to the allowed frontend origins; configure `VITE_API_BASE_URL` in Vercel if the API URL changes.
- **Docker:** `docker compose up --build` from the repository root with `GROQ_API_KEY` set in your environment. Do not commit keys.
- **CI:** GitHub Actions validates the frontend and tests backend request contracts.

**Important:** Deploy the backend changes independently. Vercel's static React deployment does **not** deploy the heavyweight sentence-transformer/FAISS Python server. If the existing Render service is still on the old code, source metadata and session isolation are not yet live.

## Current limitations and planned improvements

1. This is a demo, not a multi-tenant production service: session IDs are not authentication and memory indices are not durable or shared between backend instances.
2. Implement authentication, a persistent user-scoped vector database, rate limiting, and upload abuse protection before handling real customer data.
3. Add OCR for scanned PDFs and verified audio transcription before advertising those file types.
4. Add evaluation fixtures for retrieval recall@k, answer faithfulness, refusal quality, and latency; publish measured results only after running the evaluation.
5. Add citations at claim-level and explicit retrieved-source highlighting.

## Project history and attribution

This repository began as a collaborative/adapted RAG document-Q&A project. The original license is **MIT**, copyright **2026 Jitendra Kumar Soni**, preserved in [LICENSE](LICENSE). The **SourceLens** redesign, session-scoped API changes, and documentation are subsequent contributions. Credit and source history should remain visible; evaluate individual contributions through Git history and pull requests.

MIT licensed. See [LICENSE](LICENSE).
