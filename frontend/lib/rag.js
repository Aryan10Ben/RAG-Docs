/** Shared Vercel AI Gateway client. Uses Vercel's short-lived OIDC token. */
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const ANSWER_MODEL = "google/gemini-2.5-flash-lite";

export function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function bad(message, status = 400) {
  return json({ detail: message }, status);
}

export async function gateway(path, payload) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    throw new Error("AI Gateway authentication is missing from this Vercel deployment.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/" + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      const upstreamMessage = data?.error?.message || data?.message || "Gateway request rejected";
      console.error("SourceLens gateway error", { path, status: response.status, message: String(upstreamMessage).slice(0, 180) });
      if (response.status === 401 || response.status === 403) throw new Error("AI Gateway authorization failed. Check Vercel AI Gateway access.");
      if (response.status === 402) throw new Error("AI Gateway credits are unavailable.");
      if (response.status === 429) throw new Error("AI service is rate limited. Please retry shortly.");
      throw new Error("AI service failed (HTTP " + response.status + ").");
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The AI service timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return -1;
  let dot = 0, norma = 0, normb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    norma += a[i] ** 2;
    normb += b[i] ** 2;
  }
  return dot / (Math.sqrt(norma * normb) || 1);
}

export function safeText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
