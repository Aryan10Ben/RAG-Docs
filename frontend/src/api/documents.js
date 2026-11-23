const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://rag-doc-q-a.onrender.com").replace(/\/$/, "");
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

function readError(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  return fallback;
}

/** The API is hosted separately from the static Vercel frontend. */
export async function uploadDocument(file, sessionId) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(API_BASE + "/files/upload", {
    method: "POST",
    headers: { "X-Session-Id": sessionId },
    body: form,
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(readError(data, "Upload failed (HTTP " + response.status + ")."));
  }
  return data;
}

export async function askDocument(question, sessionId) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60000);
  const started = performance.now();
  try {
    const response = await fetch(API_BASE + "/chat/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(readError(data, "Answer request failed (HTTP " + response.status + ")."));
    }
    return { ...data, seconds: ((performance.now() - started) / 1000).toFixed(1) };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The request timed out after 60 seconds. The model service may be waking up. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
