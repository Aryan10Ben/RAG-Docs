import { bad, EMBEDDING_MODEL, gateway, json, safeText } from "../lib/rag.js";

export async function GET() {
  return json({ status: "ok", service: "sourcelens-index", embedding_model: EMBEDDING_MODEL });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return bad("Invalid JSON."); }
  const incoming = body?.chunks;
  if (!Array.isArray(incoming) || !incoming.length || incoming.length > 60) {
    return bad("Provide between 1 and 60 text chunks.");
  }
  const chunks = incoming.map((item) => ({
    text: safeText(item?.text, 1100),
    filename: safeText(item?.filename, 160),
    page: Number(item?.page),
  }));
  if (chunks.some((item) => item.text.length < 20 || !item.filename || !Number.isInteger(item.page) || item.page < 1 || item.page > 80)) {
    return bad("Invalid chunk text, file, or page information.");
  }
  if (chunks.reduce((sum, item) => sum + item.text.length, 0) > 65_000) {
    return bad("Document contains too much text for this demo.");
  }
  try {
    const result = await gateway("embeddings", {
      model: EMBEDDING_MODEL,
      input: chunks.map((item) => item.text),
    });
    const ordered = Array.isArray(result.data) ? [...result.data].sort((a, b) => a.index - b.index) : [];
    if (ordered.length !== chunks.length || ordered.some((item) => !Array.isArray(item.embedding))) {
      throw new Error("Embedding response was incomplete.");
    }
    const indexed = chunks.map((item, idx) => ({ ...item, embedding: ordered[idx].embedding }));
    return json({ status: "success", model: EMBEDDING_MODEL, chunks_added: indexed.length, indexed });
  } catch (error) {
    console.error("Index request failed", error.message);
    return bad(error.message || "Unable to create document embeddings.", 502);
  }
}
