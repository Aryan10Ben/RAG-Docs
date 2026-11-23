# SourceLens Frontend + Vercel API

React 19 / Vite minimal PDF upload and question-answer UI. This Vercel project deploys static assets **and** serverless PDF/Q&A endpoints.

## Development

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Vite's dev server does not automatically emulate Vercel Functions. The deployed API consists of `api/extract.py` (FastAPI + PyPDF2), `api/index.js` (lexical vector index) and `api/ask.js` (source retrieval + answer).

**Default answer is extractive**, supported by PDF text. It is not LLM-generated. Optional AI generation requires an explicitly configured Vercel AI Gateway and verified billing. See [Vercel RAG notes](../docs/VERCEL_RAG.md).

**Never upload confidential PDFs** to the public demo. Documents are not persistently stored by this example and the browser holds vectors in memory. No user authentication is provided.

Project: https://sourcelens-rag.vercel.app
