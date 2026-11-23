export default function AnswerList({ conversations, onClear }) {
  return (
    <section className="results" aria-label="Answers">
      <div className="results-heading">
        <div><span className="small-label">YOUR RESULTS</span><h2>Conversation insights</h2></div>
        <div className="results-actions">
          <span>{conversations.length} {conversations.length === 1 ? "answer" : "answers"}</span>
          {conversations.length > 0 && <button type="button" onClick={onClear}>Clear chat</button>}
        </div>
      </div>
      {conversations.length === 0 ? (
        <div className="empty-state"><span className="empty-symbol">✳</span><strong>Your answers will appear here</strong><p>Upload a PDF and ask your first question to start exploring its contents.</p></div>
      ) : conversations.map((item) => (
        <article className="answer-card" key={item.id}>
          <div className="answer-header"><span className="answer-avatar">✦</span><span>DOCUMENT ASSISTANT</span><small>{item.seconds}s response</small></div>
          <h3>{item.question}</h3>
          <p className="answer-text">{item.answer}</p>
          {item.sources.length > 0 && (
            <div className="sources">
              <strong>Retrieved passages</strong>
              <div className="source-grid">
                {item.sources.map((source, index) => (
                  <div className="source-card" key={index}>
                    <span>{source.filename || source.document || "Document"}{source.page ? " · Page " + source.page : ""}</span>
                    {source.snippet && <p>{source.snippet}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="answer-footer">
            <span>AI-generated — verify important details against the source.</span>
            <button type="button" onClick={() => navigator.clipboard?.writeText(item.answer)}>Copy answer ↗</button>
          </div>
        </article>
      ))}
    </section>
  );
}
