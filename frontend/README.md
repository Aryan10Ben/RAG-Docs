# SourceLens — Frontend and Vercel Functions

[Live SourceLens](https://sourcelens-rag.vercel.app) · [Main README](../README.md) · [Detailed API and deployment guide](../docs/VERCEL_RAG.md)

This directory contains the **complete deployed SourceLens application**: a React/Vite interface and same-origin Vercel Functions for PDF extraction, indexing, and answering.

## Features

- Matte-black UI with original revolving orbital backdrop and kinetic typography
- SourceLens logo and animated glass PDF dropzone
- Drag-and-drop / browse upload, type/size validation, clear error states
- Session-held document vectors and multiple questions per uploaded PDF
- Expandable supporting excerpts with filename and page number
- Responsive layout and `prefers-reduced-motion` support

## Project structure

```text
frontend/
├── src/
│   ├── App.jsx                  # Upload and document Q&A workspace
│   ├── App.css                  # Layout, glass UI, brand and motion
│   ├── api/documents.js         # Same-origin API transport
│   └── components/
│       └── OrbitalBackdrop.jsx  # Original animated globe
├── api/
│   ├── extract.py               # FastAPI/PyPDF2 PDF parsing
│   ├── index.js                 # Hashed lexical passage vectors
│   └── ask.js                   # Retrieval and sourced answer
├── lib/
│   ├── local-retrieval.js       # Lexical embeddings, cosine retrieval helper
│   ├── gemini.js                # Optional server-side Gemini adapter
│   ├── groq.js                  # Optional server-side Groq adapter
│   └── rag.js                   # Shared API and Gateway utilities
├── tests/                       # Node API and provider adapter tests
├── requirements.txt            # Python dependencies for Vercel
└── package.json
```

## Commands

```bash
npm ci
npm run lint
npm test
npm run build
npm run dev
```

**Important:** `npm run dev` starts only Vite. It does not automatically emulate Vercel's Python and Node API Functions. Test the full upload-and-answer flow on a Vercel preview or via a linked Vercel CLI dev environment.

### API base URL

In the deployed app, `VITE_API_BASE_URL` should be **unset or empty**. The frontend calls `/api/extract`, `/api/index`, and `/api/ask` on the **same origin**. The old Render backend is not used.

Do **not** put provider secrets in any `VITE_*` variable. Those are bundled into publicly readable JavaScript. See [the API guide](../docs/VERCEL_RAG.md) for optional server-side Gemini and Groq configuration.

## Answering modes

| Mode | Status | Implementation |
| --- | --- | --- |
| Extractive source-grounded answers | **Verified live** | Lexical vectors + cosine retrieval + sentence extraction |
| LLM-generated answers | **Optional, unverified live** | Gemini, Groq, or Vercel AI Gateway when explicitly configured |

The default is **not** neural semantic RAG or LLM-generated output; it is a compact, useful baseline that supports real PDF Q&A with traceable passages.

## Operational scope

- Text-based PDF only, maximum 3.5 MB / 80 pages
- Maximum 60 chunks per upload; 180 within one tab
- No accounts, persistent uploads, OCR, or production-grade abuse controls
- Only upload **non-sensitive** documents to the public demo

### Tests

The end-to-end Playwright test lives in [`backend/tests/live_vercel_ui_smoke.py`](../backend/tests/live_vercel_ui_smoke.py); it tests file selection, drag-and-drop, invalid files, multiple factual questions, abstentions, citations, and mobile layout. The real API test is in [`backend/tests/live_vercel_rag_smoke.py`](../backend/tests/live_vercel_rag_smoke.py).

Please refer to the [main README](../README.md) and [architecture guide](../docs/VERCEL_RAG.md) when describing the project in a portfolio or interview.
