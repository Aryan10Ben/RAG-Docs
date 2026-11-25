import { bad, json, safeText } from "../lib/rag.js";
import { lexicalEmbedding, LOCAL_MODEL } from "../lib/local-retrieval.js";

export async function GET() {
  return json({ status: "ok", service: "sourcelens-index", embedding_model: LOCAL_MODEL, mode: "local" });
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
  // Deterministic vector embeddings require no external service or secrets.
  // Generation is an independent, opt-in service controlled in /api/ask.
  const indexed = chunks.map((item) => ({
    ...item,
    embedding: lexicalEmbedding(item.text),
    embedding_model: LOCAL_MODEL,
  }));
  return json({ status: "success", model: LOCAL_MODEL, chunks_added: indexed.length, indexed });
}
