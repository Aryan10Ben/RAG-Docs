/** Optional Gemini API integration for SourceLens.
 *
 * Server-side only. Configure GEMINI_API_KEY and RAG_GENERATION_PROVIDER=gemini
 * in Vercel Project Settings. Free-tier availability and quota vary by account.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export async function generateWithGemini(messages, fetchImpl = fetch) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini is not configured. Set GEMINI_API_KEY securely in your Vercel project.");
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error("Invalid Gemini model identifier.");
  }
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const prompt = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  if (!prompt.trim()) throw new Error("No grounded question was supplied.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetchImpl(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
        signal: controller.signal,
      }
    );
    if (!response.ok) {
      console.error("Gemini request failed", { status: response.status });
      if (response.status === 400) throw new Error("Gemini rejected the request or model configuration.");
      if (response.status === 401 || response.status === 403) throw new Error("Gemini API key invalid, unauthorized, or free-tier access unavailable.");
      if (response.status === 404) throw new Error("The chosen Gemini model is unavailable for this API key.");
      if (response.status === 429) throw new Error("Gemini free-tier rate limit reached. Please retry later.");
      throw new Error("Gemini answer service failed (HTTP " + response.status + ").");
    }

    const result = await response.json();
    const answer = (result?.candidates?.[0]?.content?.parts || [])
      .filter((part) => typeof part.text === "string")
      .map((part) => part.text)
      .join("")
      .trim();
    if (!answer) {
      throw new Error("Gemini returned no usable answer. Please try a different question.");
    }
    return { answer, model };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Gemini request timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
