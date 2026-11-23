/** Optional Groq LLM backend (server-side only). No secrets are sent to the browser.
 * Configure GROQ_API_KEY and RAG_GENERATION_PROVIDER=groq in Vercel.
 */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

export async function generateWithGroq(messages, fetchImpl = fetch) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq is not configured. Set GROQ_API_KEY in your Vercel project environment.");
  }
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_completion_tokens: 850,
        reasoning_effort: "low",
        include_reasoning: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("Groq completion request failed", { status: response.status });
      if (response.status === 401 || response.status === 403) throw new Error("Groq API key is invalid or access is denied.");
      if (response.status === 429) throw new Error("Groq free-tier rate limit reached. Retry later.");
      throw new Error("Groq answer service failed (HTTP " + response.status + ").");
    }
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("Groq returned an empty answer.");
    }
    return { answer: answer.trim(), model };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Groq request timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
