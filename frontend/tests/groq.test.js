import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GROQ_MODEL, generateWithGroq } from "../lib/groq.js";

test("Groq generation requires a server-side key", async () => {
  const previous = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    await assert.rejects(generateWithGroq([{ role: "user", content: "hello" }], async () => {
      throw new Error("Unexpected network request");
    }), /Set GROQ_API_KEY/);
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test("Groq adapter sends grounded messages and parses answer with mock transport", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = "synthetic-secret-for-test-only";
  delete process.env.GROQ_MODEL;
  try {
    const messages = [
      { role: "system", content: "Use only retrieved passages." },
      { role: "user", content: "Source: the number is 481726. Question: what number?" },
    ];
    const result = await generateWithGroq(messages, async (url, options) => {
      assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
      assert.equal(options.headers.Authorization, "Bearer synthetic-secret-for-test-only");
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, DEFAULT_GROQ_MODEL);
      assert.deepEqual(payload.messages, messages);
      assert.equal(payload.reasoning_effort, "low");
      assert.equal(payload.include_reasoning, false);
      assert.ok(payload.max_completion_tokens >= 800);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "The number is 481726." } }] }),
      };
    });
    assert.equal(result.answer, "The number is 481726.");
    assert.equal(result.model, DEFAULT_GROQ_MODEL);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  }
});
