# SourceLens — Live PDF Verification Record

**Last release-candidate tests:** November 25, 2026  
**Current public version:** [SourceLens on Vercel](https://sourcelens-rag.vercel.app)

## ✅ Working: Vercel extractive PDF Q&A

A synthetic, non-sensitive PDF was uploaded and queried through **real hosted Vercel API Functions**. It contained two known facts: certificate number **481726** and research cohort size **73**.

| Check | Recorded result |
| --- | --- |
| `GET /api/extract`, `/api/index`, `/api/ask` | All HTTP 200 |
| Real PDF upload with known facts | HTTP 200; correct page text |
| Passage-vector indexing | HTTP 200; expected indexed chunks returned |
| Q&A retrieval | HTTP 200; answer **481726** returned |
| Source evidence | Filename `silver-compass.pdf`, page **1**, matching passage |
| Browser file picker | Success |
| Browser drag and drop | Success |
| Invalid non-PDF upload | Rejected in UI |
| Second browser question | Correct answer **73** |
| Unsupported question | Returned a no-answer message |
| Mobile/reduced motion | Passed |
| Browser JavaScript errors | Zero uncaught errors |

**Reproducible evidence:**  
- [Actual HTTP PDF-to-answer test — PASS](https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45679302905)
- [Chromium PDF/drag-and-drop/answer/UI test — PASS](https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45679291385)
- [GitHub Actions source and test scripts](../backend/tests/)

These are acceptance tests of the **source-grounded extractive mode**. They do **not** verify live Gemini/Groq model generation.

## What the verified answer looked like

> The certification number of the Silver Compass project is 481726. (Source: silver-compass.pdf, p. 1)

The response also included a source snippet and a retrieval score. The score represents lexical similarity, not confidence in factual truth.

## ⚙️ Not yet verified: an external LLM in production

The active default produces source excerpts. The codebase also contains **optional** Gemini, Groq and Vercel AI Gateway generation adapters. A provider key/billing configuration is required before model-generated answers can be tested. Unit tests of these adapters use mock transports and are **not** live provider evidence.

Before marking this portion complete, configure a provider securely, deploy, and repeat the known-answer PDF smoke test with `RAG_EXPECTED_ANSWER_MODE=llm`, checking both the answer and its retrieved passages. Do not make unqualified claims of "LLM-powered RAG" until that passes.

## Historical incident: old Render backend (resolved by architecture replacement)

On November 23, 2026, the earlier API at `https://rag-doc-q-a.onrender.com` failed an end-to-end test:

- `GET /health` — timed out (45 seconds)
- `GET /` — timed out (45 seconds)
- `POST /files/upload` — timed out (210 seconds)
- `POST /chat/ask` — blocked because upload failed

Historical run: [Render smoke test failure](https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45237011953).

**Resolution:** The app was re-architected onto same-origin Vercel Functions, removing the old Render dependency. Subsequent PDF and browser tests passed. The Render outage is not representative of the current Vercel application's extractive path.

## Remaining limitations

The public demo has no authentication, permanent document store, OCR, or production-grade abuse safeguards. Its retrieval uses local lexical vectors rather than semantic FAISS in the deployed path. Use **non-sensitive PDF documents** only.

For architecture, API definitions, live testing and provider setup, see [VERCEL_RAG.md](VERCEL_RAG.md).
