import test from "node:test";
import assert from "node:assert/strict";
import { generateWithGemini, DEFAULT_GEMINI_MODEL } from "../lib/gemini.js";

test("Gemini server adapter requires configuration", async () => {
  const before = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(generateWithGemini([{role:"user",content:"hello"}], async () => {
      throw new Error("Network unexpectedly invoked");
    }), /Set GEMINI_API_KEY/);
  } finally {
    if (before === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = before;
  }
});

test("Gemini sends grounded prompts and correctly reads response", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "local-test-placeholder";
  const messages = [
    { role:"system", content:"Use only supplied PDF sources." },
    { role:"user", content:"Page 1: certificate 481726. What certificate?" },
  ];
  try {
    const result = await generateWithGemini(messages, async (url, options) => {
      assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/" + DEFAULT_GEMINI_MODEL + ":generateContent");
      const input = JSON.parse(options.body);
      assert.match(input.systemInstruction.parts[0].text, /supplied PDF/);
      assert.match(input.contents[0].parts[0].text, /481726/);
      return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:"Certificate "},{text:"481726 (page 1)."}]}}]})};
    });
    assert.equal(result.answer, "Certificate 481726 (page 1).");
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test("Gemini handles a provider rate-limit response", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "local-test-placeholder";
  try {
    await assert.rejects(generateWithGemini([{role:"user",content:"test"}],async()=>({ok:false,status:429})),/rate limit/);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
