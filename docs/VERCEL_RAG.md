# SourceLens Vercel RAG Deployment and Verification

## 2026-11-24 current state

The `design/thalius-inspired-minimal-v2` branch contains the minimal frontend and a new same-origin Vercel API. A live PDF integration test passed against the Vercel preview, including the known-answer fact `481726` and supporting source metadata.

**Note:** The default answering mode is **extractive**, not a language model. Full LLM RAG is behind a deliberate opt-in and has not passed a live test. Vercel AI Gateway currently responds with HTTP 403 indicating a credit card is required; alternatively, Groq supports its own rate-limited free API tier when a key is configured.

## API and request flow

1. `POST /api/extract` — multipart PDF under 3.5 MB; FastAPI extracts page-aware text. Returns `{status, filename, pages, chunks}`.
2. `POST /api/index` — `{chunks}`; returns `{status, model: 'local-hashed-lexical-v1', indexed}` with per-chunk normalized lexical vectors. No external API call.
3. `POST /api/ask` — `{question, chunks: indexed}`; performs cosine similarity to rank the chunks; extracts a matching source sentence with citations.
4. `GET /api/extract`, `/api/index`, `/api/ask` — health responses.

Response fields: `answer`, `sources` (each has `filename`, `page`, `snippet`, `score`), `answer_mode` (`extractive` or `llm`), and `retrieval` metadata. The frontend must not call this `llm` unless the API actually reports that mode.

## Limitations

- This is a portfolio demo, not a private SaaS. No auth, persistence, durable vector database, or per-user security boundary.
- Frontend keeps uploaded chunks/vectors in JS memory. Reloading loses them.
- The embedding model is deterministic lexical hashing, not a trained semantic encoder. It cannot reliably match paraphrases and may miss context.
- The default answer quotes source text. It cannot synthesize or reason like a generative LLM.
- PDF extraction: text-based PDFs only; 3.5MB, 80 pages, 60 chunks per file; 180 chunks per browser session.
- The backend uses one Vercel project and avoids the old Render URL. Old `backend/app` FastAPI/FAISS/Groq code remains separate from the hosted path.

## How to enable full generated RAG after approval

1. In Vercel account settings, review AI Gateway billing and add a payment method *only if you consent*. Establish usage budgets and/or request limits first; these API routes are public.
2. In Vercel Project Settings > Environment Variables, set `RAG_GENERATION_PROVIDER=vercel-gateway` as a server-side variable for the intended environment.
3. Confirm OIDC federation is enabled in project security settings. Do not expose OIDC or provider API keys in `VITE_*` variables.
4. Deploy a preview and run the real integration test. Confirm `answer_mode='llm'`, accurate answer, and returned source passages.
5. Run the browser upload/ask test and verify no CORS or client errors. Only then merge to production if full LLM RAG is required.

AI Gateway returns a billing error (HTTP 403 requiring a valid card) from this account during the first real embedding attempt. Never treat a GET health-check as evidence that the model works.

## Recommended free-tier alternative: Gemini Flash-Lite

The backend now supports `RAG_GENERATION_PROVIDER=gemini`, using Gemini's direct REST API, without Vercel AI Gateway billing. It defaults to `gemini-2.5-flash-lite`, which Google lists in its Free Tier pricing table (availability/quota determined by your actual Google AI Studio project).

1. Create your key at https://aistudio.google.com/apikey; do not send it in chat or commit it.
2. In Vercel Project Settings -> Environment Variables add `GEMINI_API_KEY` as a sensitive **server-side** secret, plus `RAG_GENERATION_PROVIDER=gemini` for your intended environment; optionally set `GEMINI_MODEL=gemini-2.5-flash-lite`.
3. Redeploy the Vercel preview to load the variables.
4. Verify a real PDF with `RAG_EXPECTED_ANSWER_MODE=llm`, and check both the answer and its retrieved supporting passages; then verify the browser workflow.

The free tier may enforce per-model request quotas, may vary by account or location, and (per Google's pricing page) Free-tier data can be used to improve Google's products. The public demo should accept only non-sensitive test PDFs and should have meaningful abuse controls before enabling any LLM generation on production.

## Alternative: Groq Free API without Vercel Gateway billing

Create an API key at https://console.groq.com/keys in your own account. The Groq Free plan has strict usage limits; check https://console.groq.com/docs/rate-limits. In Vercel > sourcelens-rag > Settings > Environment Variables, securely add:

- `GROQ_API_KEY` — **sensitive**, server-side; paste it only into the Vercel dashboard, never into this repository or chat.
- `RAG_GENERATION_PROVIDER` — `groq`.
- Optional: `GROQ_MODEL` — defaults to `openai/gpt-oss-20b` (current Groq model; older Llama 3.1 8B identifiers have been retired).

Redeploy after setting variables, then run the live test with `RAG_EXPECTED_ANSWER_MODE=llm`. Until that test passes, do not claim live LLM RAG works. Public routes will need suitable abuse/rate limits before production use.

## Test commands

```bash
cd frontend
npm ci
npm run lint && npm test && npm run build

# Back at repo root, after: pip install requests reportlab
RAG_API_URL=https://YOUR-VERCEL-PREVIEW.vercel.app python backend/tests/live_vercel_rag_smoke.py
```

Latest real API test: https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45244610161

Latest real browser test (desktop + mobile screenshots): https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45244616746

Latest React/Python CI: https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45244623235

## Release checklist

- [x] API serves on Vercel
- [x] Real PDF extracted with page numbers
- [x] Index vectors returned
- [x] Relevant source retrieved
- [x] Extractive answer matches the PDF's known fact
- [x] Evidence filename and page included
- [x] Browser upload/answer UI verified on the same preview
- [ ] Full LLM-generation backend authorized and verified
- [ ] Usage limits / anti-abuse safeguards reviewed for paid AI
- [ ] Merge reviewed changes into main
