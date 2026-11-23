# SourceLens Engineering Plan

## Phase 0 — Repository and hosting
- [x] Confirm GitHub ownership and preserve the original MIT license.
- [x] Connect the existing repository to the user's Vercel account as `sourcelens-rag`.
- [x] Use `frontend/` as the Vercel root and verify a successful Vite build.
- [ ] Verify the connected Render API version and roll out backend changes separately.

## Phase 1 — Interface and correctness
- [x] Rename interface to SourceLens with responsive layout.
- [x] Support drag/drop, PDF size checking, loading/error states, prompt suggestions, chat history, and answer copying.
- [x] Stop advertising unsupported audio/video ingestion.
- [x] Sanitize uploads and enforce 10 MB PDF / 120 page limits.
- [x] Return page-aware retrieved passages and isolate FAISS by browser session.
- [x] Add React lint/build and FastAPI API tests to CI.
- [ ] Verify a real PDF-to-answer flow end-to-end on the deployed backend.

## Phase 2 — Production engineering
- [ ] Move sessions into an authenticated user/document model.
- [ ] Persist chunk embeddings and metadata in a multi-instance vector database.
- [ ] Add quotas, file scanning, structured logs, error monitoring, and rate limiting.
- [ ] OCR for scanned documents, then separately implement audio/video transcription.

## Phase 3 — Measured RAG quality
- [ ] Build labeled evaluation documents and expected evidence.
- [ ] Measure retrieval recall@k, answer faithfulness, refusals, cost, and latency.
- [ ] Compare semantic chunking, hybrid retrieval and reranking.
- [ ] Publish reproducible evaluation results and limitations.

## Release gates
A release is ready when the React build, ESLint, API tests, Vercel preview build, and backend compatibility checks pass. Public deployment does not imply the backend has been updated automatically.
