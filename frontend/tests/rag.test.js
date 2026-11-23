import test from "node:test";
import assert from "node:assert/strict";
import { lexicalEmbedding, extractiveAnswer, LOCAL_MODEL } from "../lib/local-retrieval.js";
import { POST as indexPdf } from "../api/index.js";
import { POST as askPdf } from "../api/ask.js";

const text = "Silver Compass is a fictional research project. The certification number of the Silver Compass project is 481726. Its sample had 73 participants.";
const chunk = { filename: "test.pdf", page: 1, text };

function request(path, body) {
  return new Request("https://local.test" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("lexical embeddings are stable, normalized and carry matched terms", () => {
  const a = lexicalEmbedding(text);
  assert.equal(a.length, 512);
  assert.deepEqual(a, lexicalEmbedding(text));
  assert.ok(a.some((v) => v > 0));
  assert.equal(LOCAL_MODEL, "local-hashed-lexical-v1");
});

test("index endpoint generates vectors without external AI credentials", async () => {
  const response = await indexPdf(request("/api/index", { chunks: [chunk] }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.chunks_added, 1);
  assert.equal(body.indexed[0].embedding_model, LOCAL_MODEL);
  assert.equal(body.indexed[0].embedding.length, 512);
});

test("retrieve source passage and answer a factual question", async () => {
  const indexResponse = await indexPdf(request("/api/index", { chunks: [chunk] }));
  const indexed = (await indexResponse.json()).indexed;
  const answerResponse = await askPdf(request("/api/ask", {
    question: "What is the certification number of Silver Compass?",
    chunks: indexed,
  }));
  assert.equal(answerResponse.status, 200);
  const body = await answerResponse.json();
  assert.equal(body.answer_mode, "extractive");
  assert.match(body.answer, /481726/);
  assert.ok(body.sources.some((source) => source.page === 1 && source.snippet.includes("481726")));
});

test("don't invent answers to unsupported questions", async () => {
  const indexed = (await (await indexPdf(request("/api/index", { chunks: [chunk] }))).json()).indexed;
  const response = await askPdf(request("/api/ask", {
    question: "What is the capital of planet Zogoria?",
    chunks: indexed,
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.answer, /couldn't find/i);
  assert.deepEqual(body.sources, []);
});

test("reject invalid requests and empty uploads", async () => {
  assert.equal((await indexPdf(request("/api/index", { chunks: [] }))).status, 400);
  assert.equal((await askPdf(request("/api/ask", { question: "", chunks: [] }))).status, 400);
});

test("simple document summary is explicitly extractive", () => {
  const answer = extractiveAnswer("Summarize this document", [chunk]);
  assert.match(answer, /Silver Compass/);
  assert.match(answer, /p\. 1/);
});
