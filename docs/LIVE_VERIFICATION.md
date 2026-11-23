# SourceLens Live RAG Verification — 2026-11-23

## Acceptance criterion
A generated PDF containing a fabricated certification number must upload to the hosted API; a factual question must then return **481726**. When the backend supports citations, the answer should include a relevant source passage.

**Result: FAILED — blocked before indexing or answering.**

## Evidence
GitHub Actions run: https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45237011953

- Target API: https://rag-doc-q-a.onrender.com
- GET /health: ReadTimeout after 45 seconds
- GET /: ReadTimeout after 45 seconds
- POST /files/upload: ReadTimeout after 210 seconds
- POST /chat/ask: not run because upload did not complete
- Job: failed, exit code 1

The smoke test creates a harmless single-page PDF and runs from GitHub Actions, rather than mocking the API.

## Interpretation
The existing deployed API was not responding to real requests at test time. That does not prove that the RAG algorithm is broken; the end-to-end answer cannot be assessed without a working API.

The current repository implements PDF extraction, chunking, SentenceTransformer embeddings, FAISS retrieval and Groq/Llama generation. The frontend calls the old Render backend, but the connected Render workspace lists ResumeIQ, not SourceLens. Hence the old service's logs or deployment cannot be managed through that workspace.

## Recovery and release criteria
1. Obtain access to the existing SourceLens Render backend or deploy the backend folder to a Render service owned by the project, checking plan costs before provisioning.
2. Configure GROQ_API_KEY securely in the backend environment; do not commit or share it.
3. Check that GET /health responds and inspect memory usage / model download startup logs.
4. Verify the PDF indexing endpoint successfully responds.
5. Set VITE_API_BASE_URL in Vercel to the verified API; explicitly allow production and preview frontend origins through CORS_ORIGINS.
6. Rerun the live_rag_smoke.py test against the real hosted API URL.
7. Test browser upload, question, answer and source passages.
8. Merge the design branch into main **only after** the user story passes.

This is a failed verification report, not a claim of successful release.

## Update — Vercel-backed source-grounded QA verified (2026-11-24)

The failed Render-service results above are historical and refer to the **old Render URL**, not the newly implemented Vercel backend.

- Same-origin Vercel API: PDF extraction, lexical vector indexing, cosine retrieval and extractive answers all returned HTTP 200.
- Hosted real PDF acceptance test: https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45244610161 — PASS, verified answer 481726 from p.1.
- Actual Chromium browser upload/ask test: https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45244616746 — PASS, desktop and mobile.
- React + Python checks: https://github.com/Aryan10Ben/RAG-Docs/actions/runs/45244623235 — PASS.
- Live **LLM-based generation remains unverified**: Vercel AI Gateway returns HTTP 403 unless account billing is configured, and Groq requires a securely configured GROQ_API_KEY. The default hosted answer mode is extractive and is labelled as such.

**Do not describe the extractive mode as live LLM RAG.** It is a working source-grounded QA baseline. Merge criteria for full LLM RAG remain conditional on an actual successful provider-backed question-answering test.
