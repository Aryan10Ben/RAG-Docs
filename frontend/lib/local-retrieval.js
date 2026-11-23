/** Local lexical vector retrieval, usable on stateless Vercel Functions without credentials.
 * This is an extractive fallback, NOT a substitute for an LLM or learned semantic embeddings.
 * Token features -> normalized 512-dimensional hashed bag-of-words vectors -> cosine search.
 */
export const LOCAL_MODEL = "local-hashed-lexical-v1";
const D = 512;
const STOPWORDS = new Set("a an the and or but if of on in at for to from with by as is are was were be been being do does did have has had it its this that these those i you your my our their they he she we they them what which who why how where when can could should would will shall about into over under there here than then also all any some each every please tell give explain describe me us document pdf answer question according based".split(" "));

function words(value) {
  const matches = String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return matches.filter((term) => term.length > 1 && !STOPWORDS.has(term)).map((term) => {
    if (term.length > 6 && term.endsWith("ing")) return term.slice(0, -3);
    if (term.length > 5 && term.endsWith("ed")) return term.slice(0, -2);
    if (term.length > 4 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
    return term;
  });
}

function hash(word) {
  let output = 2166136261;
  for (let index = 0; index < word.length; index++) {
    output ^= word.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

export function lexicalEmbedding(text) {
  const embedding = new Array(D).fill(0);
  const counts = new Map();
  for (const token of words(text)) counts.set(token, (counts.get(token) || 0) + 1);
  for (const [term, count] of counts) {
    embedding[hash(term) % D] += 1 + Math.log(count);
  }
  const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) || 1;
  return embedding.map((value) => Math.round((value / norm) * 1e6) / 1e6);
}

function overlapScore(sentence, queryTerms) {
  const terms = new Set(words(sentence));
  let total = 0;
  for (const term of queryTerms) if (terms.has(term)) total += 1;
  return total;
}

function extractSentences(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  return text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 8);
}

/** Returns an actual source passage, not hallucinated or AI-generated text. */
export function extractiveAnswer(question, sources) {
  const queryTerms = new Set(words(question));
  const summary = /\b(summarize|summary|overview|key points|main ideas)\b/i.test(question);
  const candidates = sources.flatMap((source) =>
    extractSentences(source.text).map((sentence) => ({
      sentence,
      filename: source.filename,
      page: source.page,
      score: overlapScore(sentence, queryTerms) +
        (sentence.length > 20 && sentence.length < 260 ? .15 : 0),
    }))
  );
  candidates.sort((a, b) => b.score - a.score);
  if (summary) {
    const seen = new Set();
    const snippets = candidates.filter((part) => {
      const key = part.sentence.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
    if (!snippets.length) return "I couldn't find readable information in this PDF.";
    return snippets.map((part) => "• " + part.sentence + " (p. " + part.page + ")").join("\n");
  }
  const best = candidates.find((item) => item.score >= 1);
  if (!best) return "I couldn't find that information in the uploaded PDF.";
  return best.sentence + " (Source: " + best.filename + ", p. " + best.page + ")";
}
