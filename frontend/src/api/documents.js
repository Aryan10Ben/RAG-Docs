/** Same-origin, serverless RAG transport. No Render dependency or client-side API keys. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const MAX_FILE_BYTES = 3_500_000;
const MAX_SESSION_CHUNKS = 180;

async function requestJson(path, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(API_BASE + path, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.detail;
      throw new Error(typeof detail === "string" ? detail : "The RAG service returned HTTP " + response.status + ".");
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Request timed out. Please retry.");
    if (error instanceof TypeError) throw new Error("Unable to reach the document service.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function uploadDocument(file) {
  const form = new FormData();
  form.append("file", file);
  const extracted = await requestJson("/api/extract", { method: "POST", body: form }, 65000);
  if (!Array.isArray(extracted?.chunks) || !extracted.chunks.length) {
    throw new Error("No extractable text found in this PDF.");
  }
  const indexed = await requestJson("/api/index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chunks: extracted.chunks }),
  }, 65000);
  if (!Array.isArray(indexed?.indexed) || indexed.indexed.length !== extracted.chunks.length) {
    throw new Error("The vector index was not generated correctly.");
  }
  return {
    document_id: crypto.randomUUID(),
    filename: extracted.filename || file.name,
    pages: extracted.pages,
    chunks_added: indexed.indexed.length,
    indexed: indexed.indexed,
  };
}

export async function askDocument(question, chunks) {
  if (!Array.isArray(chunks) || !chunks.length) {
    throw new Error("Upload a PDF first.");
  }
  if (chunks.length > MAX_SESSION_CHUNKS) {
    throw new Error("Document session reached the 180-chunk limit.");
  }
  const started = performance.now();
  const result = await requestJson("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, chunks }),
  }, 65000);
  return { ...result, seconds: ((performance.now() - started) / 1000).toFixed(1) };
}
