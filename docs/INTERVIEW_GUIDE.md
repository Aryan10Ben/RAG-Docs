# SourceLens — Interview Presentation Guide

## 30-second introduction

"SourceLens is a document question-answering application built with React and FastAPI. Instead of asking a language model to guess about a PDF, the backend extracts its text, creates embeddings for smaller passages, and retrieves the passages closest to the question using FAISS. A Groq-hosted LLM receives those passages as context and produces a grounded answer. I extended the initial collaborative project with a redesigned React workspace, session-scoped retrieval, page-level source metadata, validated uploads, API tests, and automated frontend checks."

**Be accurate about authorship.** This project began from an existing MIT-licensed implementation. Describe the exact work you contributed, point to the relevant pull request, and credit the original collaborator/license.

## 2-minute walkthrough

1. **Problem:** Users have long PDFs but need concise, document-grounded answers.
2. **Frontend:** A React state-driven workspace manages PDF selection, indexing state, prompts, error handling, answer history, and source previews.
3. **Ingestion:** FastAPI validates a 10 MB PDF, extracts page text with PyPDF2, and splits each page into overlapping word chunks.
4. **Embedding/index:** SentenceTransformers `all-MiniLM-L6-v2` produces 384-dimensional normalized embeddings; FAISS searches by inner product (cosine similarity when normalized).
5. **Retrieval/generation:** For each question, retrieve up to four high-scoring chunks for that session, then send those chunks and a constrained system prompt to Groq's `llama-3.1-8b-instant`.
6. **Result:** The API returns answer text and the retrieved filename/page/snippet/score metadata, which the UI displays when supported by the deployed API.
7. **Limitations:** The index is in-memory; the app is not authenticated; backend deployment and model startup can be slow. These are planned improvements, not hidden problems.

## Architecture decisions

### Why RAG instead of putting the full PDF into the prompt?
Token limits, higher inference cost, attention dilution, and a lack of traceable source passages. Retrieval narrows the context to relevant excerpts.

### Why chunk text with overlap?
Smaller chunks are easier to retrieve specifically. Overlap helps preserve context when sentences cross chunk boundaries. The present approach splits by **words**, not semantic sections; section-aware chunking is an improvement opportunity.

### Why normalize embeddings?
Normalized vectors permit inner-product ranking to approximate cosine similarity. Dot-product magnitudes then primarily reflect semantic alignment, not raw embedding length.

### Why store page numbers?
Each chunk can point back to a page in the original PDF. This provides useful retrieval evidence but does **not** guarantee that every sentence of the generated answer is correct.

### Why session isolation?
The initial baseline used a single global vector index for every upload. That could cause one user's question to retrieve another user's chunks. The revised application indexes per random browser session token. It is **not secure multi-user authentication**; for real users, adopt logged-in ownership, authorization, storage encryption, and a persistent vector service.

### Why keep the Python backend outside Vercel?
The browser-facing React app is static and works well on Vercel. The embedding model/FAISS Python process is much heavier, requires predictable model availability, and currently stores an in-memory index. A long-lived container host is more suitable for this implementation.

### How does the frontend handle failures?
It reports invalid types, size-limit violations, HTTP error messages, upload states, a 60-second question timeout, and server/model errors. It does not fabricate a successful response when the API fails.

## What I would evaluate next

Build a small human-graded dataset of documents, questions, reference passages and expected answer facts. Report:

- **Retrieval recall@k:** Is a relevant passage among the top k results?
- **Precision@k:** How many retrieved chunks are truly relevant?
- **Answer faithfulness:** Are answer claims supported by retrieved evidence?
- **Abstention correctness:** Does the system refuse when context lacks the answer?
- **Latency:** Upload time, p50/p95 query latency, and model cold-start impact.
- **Isolation:** A question in session A must never retrieve passages from session B.

Never claim measured improvements without a recorded dataset and results.

## Questions an interviewer may ask

**Q: Does using RAG eliminate hallucinations?**  
No. It reduces the chance of unsupported answers but the model can still misread context. Retrieval quality and answer evaluation are separate problems.

**Q: What happens when the PDF is scanned?**  
PyPDF2 cannot read text inside images. OCR is required, and the API currently rejects PDFs with no extractable text.

**Q: What happens on a server restart?**  
The in-memory FAISS indices disappear. We intentionally document that trade-off and would move to a persistent vector database for production.

**Q: Can two backend instances serve the same session?**  
Not reliably with this memory-only design; the state is local to each process. A shared vector database and durable metadata store are required.

**Q: How would you secure uploads?**  
User authentication, authorization checks on every document/query, file scanning, quotas, strict CORS, rate limits, safe content handling, and encrypted storage.

**Q: How would you improve retrieval quality?**  
Try semantic chunk boundaries, configurable chunk size/overlap, hybrid BM25+dense retrieval, reranking, metadata filters, and evaluation-driven parameter selection.

**Q: Why not claim the retrieved passages are true citations?**  
The current result returns passages retrieved by similarity. It does not verify each generated claim against a specific quoted sentence.

## Honest resume bullets

- Enhanced a collaborative RAG document-Q&A system with a responsive React workspace, guided document uploads, question history, and retrieved passage previews.
- Refactored FastAPI retrieval to scope FAISS indices per browser session and attach PDF page metadata to results.
- Added PDF validation, error handling, API contract tests, frontend lint/build checks, and Vercel deployment integration.

Use only bullets corresponding to changes that have been merged, tested, and deployed. Do not claim OCR, audio/video processing, persistent vector storage, production authentication, or benchmarked accuracy.
