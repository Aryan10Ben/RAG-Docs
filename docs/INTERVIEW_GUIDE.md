# SourceLens — Resume and Technical Interview Guide

[Public demo](https://sourcelens-rag.vercel.app) · [Code](https://github.com/Aryan10Ben/RAG-Docs) · [Architecture](VERCEL_RAG.md)

**Rule for interviews:** Clearly separate **(A) the tested Vercel application**, **(B) the legacy semantic FAISS backend retained in the repo**, and **(C) optional LLM generation that has not yet been live-enabled**. Never present a unit-tested API adapter as a proven production LLM integration.

## Your 30-second introduction

> “SourceLens is a PDF question-answering project I contributed to and extended with a redesigned React interface and serverless API. Users can upload a text-based PDF, ask questions and inspect answers with page-level evidence. The deployed Vercel version splits PDF text into passages, creates lightweight lexical vectors, retrieves the closest passages using cosine similarity and extracts a grounded answer. I also added real browser and PDF integration tests. The repository retains a separate SentenceTransformers-and-FAISS implementation, while Gemini and Groq generation are available as optional server-side integrations that still need live provider verification.”

Adjust claims about personal authorship to match your actual Git commits. The project began as existing collaborative code covered by an MIT license.

## Two-minute walkthrough (deployed application)

1. **Problem:** People want to ask factual questions about long PDFs without browsing manually.
2. **UX:** React 19 / Vite; drag-and-drop or file-picker upload; concise answer composer; source citations; motion-aware responsive interface.
3. **Ingestion:** a Python FastAPI Vercel Function validates the text-based PDF, enforces **3.5 MB / 80 pages**, parses text with PyPDF2 and splits it into overlapping page-aware chunks.
4. **Indexing:** a Node Vercel Function produces normalized **512-dimensional hashed lexical vectors**. These vectors are deterministic, not pretrained semantic embeddings.
5. **State:** passages, vectors and conversation history are stored in the current browser tab; the public API is stateless.
6. **Retrieval:** each user query is hashed to a vector, ranked by cosine similarity, and matched to up to **four** passages.
7. **Answer:** by default, the API extracts a relevant passage sentence and returns source filename, page, excerpt and similarity score. Unsupported questions get a no-answer response when retrieval is insufficient.
8. **Verification:** real synthetic-PDF and Chromium tests exercise extraction, indexing, two distinct facts, drag-and-drop, unsupported questions, and source display. The published pipeline is **extractive**.
9. **Optional generation:** Gemini, Groq and Vercel AI Gateway adapters can turn retrieved passages into generated answers after a server-side provider is configured, but no live model-backed success has yet been established.

## Know the difference between the two implementations

| Topic | Live Vercel app | Separate legacy Python backend |
| --- | --- | --- |
| Chunking | Overlapping character chunks with page numbers | Overlapping word windows |
| Embeddings | Deterministic 512-dimensional lexical hashing | SentenceTransformers `all-MiniLM-L6-v2` 384-d semantic vectors |
| Search | Cosine similarity in Node Function | FAISS `IndexFlatIP` with normalized vectors |
| Answer | Source sentence extraction | Groq LLM generation when configured |
| State | Browser-tab vector memory | Process-local, session-keyed FAISS index |
| Publicly verified? | **Yes, extractive flow** | **No, old hosted Render service timed out** |
| Required API key | None for default | Groq for generation |

**Never conflate the deployed lexical vectors with FAISS or semantic embeddings.** The repo contains those components, but they are not used by the published Vercel request path.

## Typical questions and precise answers

**Q. Why retrieval instead of sending the entire PDF to a model?**  
Retrieval reduces relevant context and can support page-level evidence. It does not itself guarantee factual accuracy. The default SourceLens deployment avoids an LLM call entirely.

**Q. Is this production-grade RAG?**  
Not yet. It is a tested public **document-grounded extractive QA demo** with hooks for generation. A full RAG application requires a configured and verified model. Broader production use also needs authentication, durable storage, monitoring, security policies and automated evaluation.

**Q. How does your current vector retrieval work?**  
Text is tokenized and hashed into 512 slots, with term weighting and normalization. We hash the question the same way and compute cosine similarity to rank matching PDF chunks. Unlike a neural embedding model, this lexical approach is fast and free but weak on paraphrases and deeper meaning.

**Q. What exactly is the citation?**  
The API returns the **retrieved filename, page and passage snippet**. The source is a traceability aid; it is not automated proof that each answer claim is correct.

**Q. How do you handle hallucination / missing answers?**  
The default mode does not generate novel sentences; it extracts source text and abstains when the retrieval signal is insufficient. It can still choose a misleading sentence. An optional LLM system instruction restricts generation to retrieved passages, but that must be evaluated once enabled.

**Q. Does the app store documents?**  
The browser holds indexed chunks and answer history for the active tab. The API receives and processes text, but there is no application-managed permanent document store or user account. This does **not** imply a guarantee about third-party infrastructure logs.

**Q. What happens with scanned or encrypted PDFs?**  
PyPDF2 cannot OCR image-only PDFs; the hosted app rejects PDFs without extractable text and password-protected PDFs. OCR would be a future feature.

**Q. Why Vercel instead of the original Render server?**  
The old Render API was not responding in integration tests. The new architecture hosts the frontend and three smaller API Functions in one Vercel project, reducing cross-origin dependencies and removing a heavyweight model process from the live request path.

**Q. What trade-off comes from keeping vectors in the browser?**  
The frontend has no durable document state; refreshing loses the index, and carrying the index on each question increases request size. This is acceptable for a small demo, not for multi-user scale.

**Q. How did you verify it works?**  
GitHub Actions runs Node and Python unit/API tests, a real hosted PDF smoke test, and a Playwright Chromium test exercising upload, drag/drop, invalid-file rejection, two factual queries, an unsupported query, source citations and mobile layout. Avoid describing adapter mock tests as real provider validation.

## Improvements I would prioritize

1. **Semantic or hybrid retrieval:** pretrained dense embeddings plus BM25-style matching, with optional reranking.
2. **Evaluation:** labelled questions/passages; retrieval recall@k, answer support/faithfulness, correct abstention and p95 latency.
3. **Storage/security:** authenticated users, per-document permissions, persistent index, quotas and cleanup.
4. **Generation:** configure Gemini or Groq securely, verify with a real PDF, impose rate limits and explicit budgets.
5. **Ingestion:** OCR and structured PDF extraction for scans, tables and complex documents.

## Resume-ready bullets — use only if contributions are yours

Two accurate, conservative examples for the **currently verified** app:

- **SourceLens — PDF Question Answering:** Redesigned a React/Vite document workspace and deployed a same-origin FastAPI + Node serverless pipeline on Vercel, supporting PDF parsing, overlapping chunks, lexical vector retrieval and page-referenced answers.
- Implemented browser-based PDF indexing and robust upload/error states; validated the workflow with **Playwright E2E tests**, real-PDF HTTP smoke tests, and automated Node/Python checks in GitHub Actions.

**After** enabling and live-verifying an LLM provider, you may add a separate bullet describing retrieval-augmented **generation** with that provider. Until then, do **not** claim deployed Groq/Gemini inference, FAISS-based production retrieval, OCR, persistent vector storage, live benchmark improvements or LLM hallucination reduction.

### One-line project description for a resume

> **SourceLens:** Deployed PDF Q&A web app built with React, FastAPI, Vercel Functions and cosine-based source retrieval, featuring PDF uploads, cited answers and automated end-to-end tests.

Keep your explanation focused on the version a recruiter can actually click.

## Responsible attribution

The repository builds on a pre-existing MIT-licensed collaborative project. The original [LICENSE](../LICENSE) credits **Jitendra Kumar Soni (2026)**. Describe the design, refactoring, new Vercel functions, tests and deployment as your own only to the extent your commits substantiate your contribution.
