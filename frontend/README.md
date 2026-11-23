# SourceLens Frontend

React 19 + Vite workspace for PDF-based document question answering.

## Development

1. Run npm ci
2. Copy .env.example to .env.local and configure the API base URL.
3. Run npm run dev
4. Run npm run lint && npm run build before committing.

Vercel project: https://sourcelens-rag.vercel.app

The API is a **separate Python/FastAPI service** and is not deployed by this Vite project. See the repository root README for API setup, security considerations, current limitations, and project attribution.
