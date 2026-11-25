import { useEffect, useRef, useState } from "react";
import { askDocument, MAX_FILE_BYTES, uploadDocument } from "./api/documents";
import OrbitalBackdrop from "./components/OrbitalBackdrop";
import "./App.css";

const PROMPTS = [
  "Summarize this document",
  "What are the key findings?",
  "Explain the main ideas",
];

function Icon({ name, size = 20 }) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "upload":
      return <svg {...shared}><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>;
    case "arrow":
      return <svg {...shared}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case "arrow-up":
      return <svg {...shared}><path d="M12 19V5m-6 6 6-6 6 6" /></svg>;
    case "file":
      return <svg {...shared}><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v6h5M8 13h8m-8 4h6" /></svg>;
    case "plus":
      return <svg {...shared}><path d="M12 5v14M5 12h14" /></svg>;
    case "close":
      return <svg {...shared}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case "check":
      return <svg {...shared}><path d="m5 12 4 4L19 6" /></svg>;
    case "copy":
      return <svg {...shared}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
    case "external":
      return <svg {...shared}><path d="M8 5h11v11m0-11L5 19" /></svg>;
    case "spark":
      return <svg {...shared}><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 14 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>;
    default:
      return null;
  }
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="SourceLens homepage">
      <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
      <span>source<span className="brand-accent">lens</span><span className="brand-stop">.</span></span>
    </a>
  );
}

function FileUpload({ selectedFile, onSelect, onUpload, busy, inputRef, compact = false }) {
  const [dragging, setDragging] = useState(false);

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!busy) onSelect(event.dataTransfer.files?.[0]);
  }

  return (
    <div className={"upload-stage" + (compact ? " compact" : "")}>
      <div
        className={"drop-target" + (dragging ? " is-dragging" : "") + (selectedFile ? " has-file" : "")}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <div className="upload-symbol"><Icon name={selectedFile ? "file" : "upload"} size={25} /></div>
        {selectedFile ? (
          <>
            <span className="selected-file-name" title={selectedFile.name}>{selectedFile.name}</span>
            <span className="drop-subtext">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · PDF ready to index</span>
          </>
        ) : (
          <>
            <strong>Drop a PDF to get started</strong>
            <span className="drop-subtext">or choose a file from your device</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="file-input"
          aria-label="Choose a PDF document"
          disabled={Boolean(busy)}
          onChange={(event) => onSelect(event.target.files?.[0])}
        />
        {selectedFile ? (
          <div className="file-action-row">
            <button className="change-file-action" type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)}>Change file</button>
            <button className="upload-action" type="button" onClick={onUpload} disabled={Boolean(busy)}>
              {busy === "upload" ? <><span className="loader" /> Indexing document...</> : <>Analyze document <Icon name="arrow" size={17} /></>}
            </button>
          </div>
        ) : (
          <button className="browse-action" type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)}>
            Browse files <Icon name="arrow" size={15} />
          </button>
        )}
      </div>
      <div className="upload-meta">
        <span>PDF only</span><span className="meta-separator" /><span>Up to 3.5 MB</span>
        {!compact && <><span className="meta-separator" /><span>Text-based documents</span></>}
      </div>
    </div>
  );
}

function DocumentStrip({ documents, onAdd, busy }) {
  return (
    <div className="document-strip">
      <div className="document-strip-label"><span className="tiny-blue-dot" /> Your documents <span className="document-count">{documents.length}</span></div>
      <div className="document-pills">
        {documents.map((document) => (
          <div className="document-pill" key={document.id} title={document.name}>
            <Icon name="file" size={15} /><span>{document.name}</span><Icon name="check" size={14} />
          </div>
        ))}
        <button className="add-document" type="button" onClick={onAdd} disabled={Boolean(busy)}>
          <Icon name="plus" size={16} /> Add PDF
        </button>
      </div>
    </div>
  );
}

function AnswerFeed({ conversations, onCopy, copiedId }) {
  if (!conversations.length) {
    return (
      <div className="answer-empty">
        <div className="answer-empty-mark"><Icon name="spark" size={23} /></div>
        <span>Ask your first question</span>
        <small>Your answers and retrieved passages will appear here.</small>
      </div>
    );
  }

  return (
    <div className="answer-feed" aria-label="Conversation">
      {conversations.map((item) => (
        <article className="answer-item" key={item.id}>
          <div className="question-line"><span className="question-marker">Q</span><h2>{item.question}</h2></div>
          <div className="answer-body">
            <span className="answer-glyph"><Icon name="spark" size={19} /></span>
            <div className="answer-content">
              <p>{item.answer}</p>
              {item.sources.length > 0 && (
                <div className="evidence">
                  <span className="evidence-label">Retrieved passages</span>
                  <div className="evidence-list">
                    {item.sources.map((source, index) => (
                      <details className="evidence-item" key={index}>
                        <summary>
                          <Icon name="file" size={14} />
                          <span>{source.filename || source.document || "Document"}{source.page ? " · Page " + source.page : ""}</span>
                          <span className="evidence-toggle">+</span>
                        </summary>
                        {source.snippet && <p>{source.snippet}</p>}
                      </details>
                    ))}
                  </div>
                </div>
              )}
              <div className="answer-actions">
                <span>{item.answer_mode === "llm" ? "AI-generated · Check cited passages" : "Extracted from your PDF · No AI generation"}</span>
                <button type="button" onClick={() => onCopy(item)} aria-label="Copy answer">
                  <Icon name={copiedId === item.id ? "check" : "copy"} size={15} />
                  {copiedId === item.id ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Feedback({ error, notice, onDismiss }) {
  if (!error && !notice) return null;
  return (
    <div className={"feedback" + (error ? " error" : " success")} role={error ? "alert" : "status"}>
      <span className="feedback-icon"><Icon name={error ? "close" : "check"} size={15} /></span>
      <span>{error || notice}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification"><Icon name="close" size={16} /></button>
    </div>
  );
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [indexedChunks, setIndexedChunks] = useState([]);
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const pickerRef = useRef(null);
  const composerRef = useRef(null);
  const feedRef = useRef(null);

  const hasDocs = documents.length > 0;
  const busyNow = Boolean(busy);

  useEffect(() => {
    if (hasDocs && !busy) composerRef.current?.focus();
  }, [hasDocs, busy]);

  function chooseFile(file) {
    setError("");
    setNotice("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("Only PDF files are supported right now.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setError("This PDF exceeds the 3.5 MB serverless upload limit.");
      return;
    }
    if (!file.size) {
      setSelectedFile(null);
      setError("That file is empty.");
      return;
    }
    setSelectedFile(file);
  }

  async function uploadFile() {
    if (!selectedFile || busyNow) return;
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const data = await uploadDocument(selectedFile);
      if (indexedChunks.length + data.indexed.length > 180) {
        throw new Error("This session already contains too much text. Refresh to start with new documents.");
      }
      setIndexedChunks((current) => [...current, ...data.indexed]);
      setDocuments((current) => [...current, {
        id: data.document_id || selectedFile.name + "-" + Date.now(),
        name: data.filename || selectedFile.name,
        size: selectedFile.size,
      }]);
      setSelectedFile(null);
      if (pickerRef.current) pickerRef.current.value = "";
      setNotice("PDF ready. You can ask a question.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to index the PDF.");
    } finally {
      setBusy("");
    }
  }

  async function askQuestion(event) {
    event?.preventDefault();
    const prompt = question.trim();
    if (!prompt || !hasDocs || busyNow) return;
    setBusy("ask");
    setError("");
    setNotice("");
    try {
      const data = await askDocument(prompt, indexedChunks);
      setConversations((current) => [...current, {
        id: Date.now() + Math.random(),
        question: prompt,
        answer: data.answer || "No answer was returned.",
        sources: Array.isArray(data.sources) ? data.sources : [],
        answer_mode: data.answer_mode || "extractive",
        seconds: data.seconds,
      }]);
      setQuestion("");
      window.requestAnimationFrame(() => feedRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to get an answer.");
    } finally {
      setBusy("");
    }
  }

  async function copyAnswer(item) {
    try {
      await navigator.clipboard.writeText(item.answer);
      setCopiedId(item.id);
    } catch {
      setError("Copying isn't available in this browser.");
    }
  }

  return (
    <div className={"site" + (hasDocs ? " has-docs" : "")} id="top">
      <OrbitalBackdrop />
      <header className="site-header">
        <nav className="nav-pill" aria-label="Main navigation">
          <Brand />
          <a className="nav-link" href="https://github.com/Aryan10Ben/RAG-Docs" target="_blank" rel="noreferrer">
            GitHub <Icon name="external" size={15} />
          </a>
        </nav>
      </header>

      <main className="page-main">
        {!hasDocs ? (
          <section className="landing">
            <div className="kinetic-hero">
              <h1 className="kinetic-title">
                <span>Upload.</span>{" "}<span>Ask.</span>{" "}<span>Find.</span>
              </h1>
              <div className="kinetic-track" aria-hidden="true"><span /></div>
              <p className="hero-description">Upload a PDF. Ask a question. Find answers.</p>
            </div>
            <FileUpload selectedFile={selectedFile} onSelect={chooseFile} onUpload={uploadFile} busy={busy} inputRef={pickerRef} />
            <Feedback error={error} notice={notice} onDismiss={() => { setError(""); setNotice(""); }} />
          </section>
        ) : (
          <section className="studio">
            <div className="studio-intro">
              <span className="eyebrow"><span className="eyebrow-dot" /> YOUR KNOWLEDGE SPACE</span>
              <h1>What would you like <span>to know?</span></h1>
              <p>Ask anything about the PDFs you've added.</p>
            </div>
            <DocumentStrip documents={documents} onAdd={() => pickerRef.current?.click()} busy={busy} />
            <div className="studio-file-input">
              <input ref={pickerRef} type="file" accept=".pdf,application/pdf" onChange={(event) => chooseFile(event.target.files?.[0])} aria-label="Add another PDF" disabled={busyNow} />
            </div>
            {selectedFile && (
              <div className="pending-file">
                <Icon name="file" size={19} />
                <span title={selectedFile.name}>{selectedFile.name}</span>
                <button className="pending-cancel" type="button" onClick={() => { setSelectedFile(null); if (pickerRef.current) pickerRef.current.value = ""; }} aria-label="Remove selected PDF"><Icon name="close" size={17} /></button>
                <button className="pending-upload" type="button" onClick={uploadFile} disabled={busyNow}>{busy === "upload" ? "Indexing..." : "Index PDF"} <Icon name="arrow" size={15} /></button>
              </div>
            )}
            <Feedback error={error} notice={notice} onDismiss={() => { setError(""); setNotice(""); }} />
            <div ref={feedRef}>
              <AnswerFeed conversations={conversations} onCopy={copyAnswer} copiedId={copiedId} />
            </div>
            <form className="composer" onSubmit={askQuestion}>
              <label htmlFor="document-question" className="visually-hidden">Ask a question about your document</label>
              <textarea
                id="document-question"
                ref={composerRef}
                rows="2"
                value={question}
                placeholder="Ask anything about your documents..."
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); askQuestion(); } }}
                disabled={busyNow}
              />
              <div className="composer-bottom">
                <span>{busy === "ask" ? "Searching your documents..." : "Enter to ask · Shift + Enter for a new line"}</span>
                <button type="submit" disabled={!question.trim() || busyNow}>
                  {busy === "ask" ? <span className="loader" /> : <Icon name="arrow-up" size={18} />}
                  <span>Ask</span>
                </button>
              </div>
            </form>
            <div className="suggestions">
              {PROMPTS.map((prompt) => (
                <button type="button" key={prompt} onClick={() => { setQuestion(prompt); composerRef.current?.focus(); }} disabled={busyNow}>
                  {prompt} <Icon name="arrow" size={14} />
                </button>
              ))}
            </div>
          </section>
        )}

      </main>

      <footer className="site-footer">
        <span>© 2026 SourceLens</span>
        <span>Session-only demo · No sensitive documents</span>
        <a href="https://github.com/Aryan10Ben/RAG-Docs" target="_blank" rel="noreferrer">View source <Icon name="external" size={13} /></a>
      </footer>
    </div>
  );
}
