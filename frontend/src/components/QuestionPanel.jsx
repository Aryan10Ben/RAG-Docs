import { useRef } from "react";

const SUGGESTIONS = [
  "Summarize the key points in this document.",
  "What are the most important findings?",
  "Explain the main ideas in simple language.",
];

export default function QuestionPanel({ hasDocs, question, onChange, onAsk, busy }) {
  const input = useRef(null);

  function selectSuggestion(value) {
    onChange(value);
    input.current?.focus();
  }

  return (
    <section className="panel ask-panel" aria-label="Ask a question">
      <div className="panel-top"><div className="panel-icon">02</div><span>AI CONVERSATION</span></div>
      <h2>Explore your content</h2>
      <p className="panel-description">Ask specific questions and get context-grounded answers.</p>
      <div className="question-box">
        <label htmlFor="question-input">YOUR QUESTION</label>
        <textarea
          id="question-input"
          ref={input}
          value={question}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); onAsk(); } }}
          placeholder={hasDocs ? "What would you like to know about your document?" : "Upload a PDF to start asking questions..."}
          disabled={!hasDocs || Boolean(busy)}
          rows={5}
        />
        <div className="question-footnote"><span>Grounded in uploaded content</span><span>⌘ / Ctrl + Enter</span></div>
      </div>
      <button className="primary-button ask-button" type="button" onClick={onAsk} disabled={!hasDocs || !question.trim() || Boolean(busy)}>
        {busy === "ask" ? <><span className="spinner" /> Finding an answer...</> : <>Generate answer <span aria-hidden="true">✦</span></>}
      </button>
      <div className="prompt-suggestions">
        <span className="small-label">TRY ASKING</span>
        {SUGGESTIONS.map((item) => <button type="button" className="prompt-chip" key={item} disabled={!hasDocs || Boolean(busy)} onClick={() => selectSuggestion(item)}>{item} <span>↗</span></button>)}
      </div>
    </section>
  );
}
