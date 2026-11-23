# SourceLens — PDF Answers With Verifiable Sources

SourceLens is a minimalist document question-answering workspace. Upload a text-based PDF, ask a question, and inspect passages and page references that support the answer.

**[Website](https://sourcelens-rag.vercel.app)** · [Vercel deployment notes](docs/VERCEL_RAG.md) · [Interview guide](docs/INTERVIEW_GUIDE.md)

> **Preview vs production:** The new Vercel API and minimal interface are in the draft `design/thalius-inspired-minimal-v2` branch. Until merged into `main`, the production website may still use the old Render API. This README describes the new review branch.

## How it works on Vercel

1. **Upload:** A Python/FastAPI Vercel Function accepts a text-based PDF and extracts text and page numbers using PyPDF2.
2. **Index:** A Node Function splits the extracted text into source-labelled chunks and calculates local, deterministic lexical vector embeddings. The frontend keeps those vectors in browser-session memory.
3. **Retrieve:** The question is converted into a vector, then the API uses cosine similarity to find the top four matching chunks.
4. **Answer:** The default mode selects a relevant sentence from the retrieved text, preserving the source citation. It makes no LLM call.
5. **Optional generation:** With explicit provider and billing configuration, a Vercel AI Gateway model can write an answer grounded in the retrieved passages.
6. **Evidence:** Retrieved source snippets and PDF page numbers are visible below the answer.

**Accuracy about RAG:** Default lexical-vector retrieval plus extractive answers is a source-grounded QA baseline, **not** full LLM-powered retrieval-augmented generation and **not** learned semantic embeddings. The legacy Python backend still contains SentenceTransformers + FAISS + Groq RAG, but is not the hosted Vercel API. The hosted model-generation branch needs a provider that has been enabled and live-tested.

## Technical stack

| Layer | Current Vercel review branch |
| --- | --- |
| Frontend | React 19 + Vite, dark minimalist UI |
| PDF parsing | Python FastAPI + PyPDF2 Vercel Function |
| Embeddings | Hashed lexical vectors (no external service) |
| Retrieval | Top-4 cosine similarity over source-labelled chunks |
| Default answer | Extractive answer sentence with document and page reference |
| Optional AI answer | Gemini 2.5 Flash Lite through Vercel AI Gateway (disabled unless configured) |
| Hosting | Single Vercel project: static frontend + Functions |
| Testing | Node unit/API tests, FastAPI tests, real hosted PDF E2E |

## Limits and privacy

- Text-based PDFs only. OCR/scanned PDFs and audio/video are not implemented.
- 3.5 MB per PDF, 80 pages, maximum 60 indexed chunks per file and 180 across the browser session.
- Session vectors and conversation history are transient browser state; a page reload loses them.
- No logins, permanent document storage, access controls, or production abuse prevention.
- Use non-sensitive PDFs. Even though the demo does not intentionally store files, the PDF is processed by a serverless function, and optional LLM generation sends relevant text to a model provider.
- Similarity scores measure passage overlap, not factual confidence. Check evidence for important questions.

## Local development and checks

```bash
cd frontend
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Vite's dev server only hosts the frontend; deploy to Vercel or use a compatible Vercel development environment to exercise the serverless API.

To verify the real hosted API with a generated synthetic PDF:

```bash
pip install requests reportlab
RAG_API_URL=https://YOUR-PREVIEW.vercel.app python backend/tests/live_vercel_rag_smoke.py
```

The test checks the PDF's fabricated certificate number **481726**, the indexed passages, the answer, and its evidence. See [docs/VERCEL_RAG.md](docs/VERCEL_RAG.md) for exact API contracts and deployment steps.

## Optional generated answers

The Vercel AI Gateway currently requires a valid credit card on file in this Vercel account. Its HTTP 403 is an account-level requirement, **not** evidence of a working LLM. Do not enable it or incur charges without approval.

When Gateway billing and appropriate usage protection are arranged, enable a server-side environment variable named `RAG_GENERATION_PROVIDER` with value `vercel-gateway`, then redeploy and test. Keep the key/OIDC token out of client code. Without this flag, the hosted API answers by extracting document sentences and says so explicitly in its response.

## Legacy Python backend

The original Python FastAPI implementation in [`backend/`](backend/) uses a local SentenceTransformer encoder (`all-MiniLM-L6-v2`), FAISS, and Groq/Llama. That code is still available for local experimentation and its own tests, but it is not used by the new same-origin Vercel UI/API architecture.

## Attribution

This repository began as a collaborative/adapted PDF RAG Q&A project. The original **MIT license, copyright 2026 Jitendra Kumar Soni**, is preserved in [LICENSE](LICENSE). Subsequent SourceLens redesign and API changes are traceable in Git history and pull requests. Describe contributions accurately in interviews.
