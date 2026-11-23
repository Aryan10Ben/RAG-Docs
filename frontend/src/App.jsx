import { useRef, useState } from "react";
import "./App.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://rag-doc-q-a.onrender.com").replace(/\/$/, "");
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SESSION_KEY = "sourcelens-session-v1";
const SUGGESTIONS = [
  "Summarize the key points in this document.",
  "What are the most important findings?",
  "Explain the main ideas in simple language.",
];

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "session-" + Math.random().toString(36).slice(2) + "-" + Date.now();
  }
}

function readError(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  return fallback;
}

async function parseResponse(response) {
  return response.json().catch(() => ({}));
}

export default function App() {
  const fileInput = useRef(null);
  const questionInput = useRef(null);
  const [sessionId] = useState(getSessionId);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);

  function chooseFile(candidate) {
    setNotice("");
    setError("");
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("Please select a PDF file. Audio and video support is planned, not available yet.");
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setError("This PDF is over the 10 MB upload limit.");
      return;
    }
    if (candidate.size === 0) {
      setSelectedFile(null);
      setError("The selected PDF is empty.");
      return;
    }
    setSelectedFile(candidate);
  }

  async function uploadFile() {
    if (!selectedFile || busy) return;
    setBusy("upload");
    setError("");
    setNotice("");
    const form = new FormData();
    form.append("file", selectedFile);
    try {
      const response = await fetch(API_BASE + "/files/upload", {
        method: "POST",
        headers: { "X-Session-Id": sessionId },
        body: form,
      });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(readError(data, "Upload failed (HTTP " + response.status + ")."));
      const doc = {
        id: data.document_id || selectedFile.name + "-" + Date.now(),
        name: data.filename || selectedFile.name,
        chunks: Number.isFinite(data.chunks_added) ? data.chunks_added : null,
        size: selectedFile.size,
      };
      setDocuments((current) => [...current, doc]);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice("Document indexed. You can now ask questions about its contents.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload this document.");
    } finally {
      setBusy("");
    }
  }

  async function askQuestion() {
    const prompt = question.trim();
    if (!prompt || !documents.length || busy) return;
    setBusy("ask");
    setError("");
    setNotice("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    const started = performance.now();
    try {
      const response = await fetch(API_BASE + "/chat/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ question: prompt }),
        signal: controller.signal,
      });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(readError(data, "Answer request failed (HTTP " + response.status + ")."));
      setConversations((current) => [{
        id: Date.now() + Math.random(),
        question: prompt,
        answer: data.answer || "No answer was returned.",
        sources: Array.isArray(data.sources) ? data.sources : [],
        seconds: ((performance.now() - started) / 1000).toFixed(1),
      }, ...current]);
      setQuestion("");
    } catch (cause) {
      if (cause?.name === "AbortError") {
        setError("The request timed out after 60 seconds. The model service may be waking up. Please try again.");
      } else {
        setError(cause instanceof Error ? cause.message : "Unable to reach the question-answering service.");
      }
    } finally {
      window.clearTimeout(timeout);
      setBusy("");
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!busy) chooseFile(event.dataTransfer.files[0]);
  }

  function fillSuggestion(value) {
    setQuestion(value);
    questionInput.current?.focus();
  }

  const hasDocs = documents.length > 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-symbol">S<span className="brand-dot">.</span></span>
          <div><strong>SourceLens</strong><small>DOCUMENT INTELLIGENCE</small></div>
        </div>
        <div className="sidebar-section">
          <span className="section-eyebrow">YOUR WORKSPACE</span>
          <div className="nav-active"><span>▦</span> Document studio <span className="nav-indicator">●</span></div>
        </div>
        <div className="sidebar-section library">
          <div className="section-heading"><span className="section-eyebrow">DOCUMENT LIBRARY</span><span className="count">{documents.length}</span></div>
          {documents.length === 0 ? (
            <p className="muted-sidebar">Your uploaded documents will appear here.</p>
          ) : documents.map((doc) => (
            <div className="library-item" key={doc.id} title={doc.name}>
              <span className="pdf-icon">PDF</span><span className="filename">{doc.name}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="how-it-works"><span className="pulse-dot" /> RAG-powered analysis</div>
          <p>Upload a PDF, retrieve relevant passages and ask questions grounded in your document.</p>
          <div className="sidebar-divider" />
          <a href="https://github.com/Aryan10Ben/RAG-Docs" target="_blank" rel="noreferrer">View project on GitHub ↗</a>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Document studio</strong></div>
          <span className="top-tag">RETRIEVAL AUGMENTED GENERATION</span>
        </header>

        <div className="main-content">
          <section className="hero">
            <div className="hero-kicker"><span className="small-star">✦</span> AI KNOWLEDGE WORKSPACE</div>
            <h1>Ask better questions.<br /><em>Find answers in your documents.</em></h1>
            <p>Transform PDFs into an interactive knowledge source. Upload a document, ask naturally, and explore the answers — with source references when available.</p>
          </section>

          <div className="studio-grid">
            <section className="panel upload-panel" aria-label="Upload a document">
              <div className="panel-top"><div className="panel-icon">01</div><span>KNOWLEDGE SOURCE</span></div>
              <h2>Add your document</h2>
              <p className="panel-description">Start by uploading a PDF to create a searchable knowledge base.</p>
              <div
                className={"dropzone" + (dragging ? " dragging" : "")}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
                onDrop={handleDrop}
              >
                <div className="upload-illustration">⇧</div>
                <strong>{selectedFile ? selectedFile.name : "Drop your PDF here"}</strong>
                <span>{selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB selected" : "or choose a file from your computer"}</span>
                <input
                  ref={fileInput}
                  type="file"
                  id="pdf-upload"
                  accept=".pdf,application/pdf"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                  disabled={Boolean(busy)}
                />
                <button className="browse-button" type="button" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}>
                  Browse files <span aria-hidden="true">↗</span>
                </button>
              </div>
              <div className="upload-footer"><span>PDF only</span><span>Max 10 MB</span><span>Searchable text required</span></div>
              <button className="primary-button upload-button" type="button" onClick={uploadFile} disabled={!selectedFile || Boolean(busy)}>
                {busy === "upload" ? <><span className="spinner" /> Processing document...</> : <>Index document <span aria-hidden="true">→</span></>}
              </button>
            </section>

            <section className="panel ask-panel" aria-label="Ask a question">
              <div className="panel-top"><div className="panel-icon">02</div><span>AI CONVERSATION</span></div>
              <h2>Explore your content</h2>
              <p className="panel-description">Ask specific questions and get context-grounded answers.</p>
              <div className="question-box">
                <label htmlFor="question-input">YOUR QUESTION</label>
                <textarea
                  id="question-input"
                  ref={questionInput}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); askQuestion(); } }}
                  placeholder={hasDocs ? "What would you like to know about your document?" : "Upload a PDF to start asking questions..."}
                  disabled={!hasDocs || Boolean(busy)}
                  rows={5}
                />
                <div className="question-footnote"><span>Grounded in uploaded content</span><span>⌘ / Ctrl + Enter</span></div>
              </div>
              <button className="primary-button ask-button" type="button" onClick={askQuestion} disabled={!hasDocs || !question.trim() || Boolean(busy)}>
                {busy === "ask" ? <><span className="spinner" /> Finding an answer...</> : <>Generate answer <span aria-hidden="true">✦</span></>}
              </button>
              <div className="prompt-suggestions">
                <span className="small-label">TRY ASKING</span>
                {SUGGESTIONS.map((item) => <button type="button" className="prompt-chip" key={item} disabled={!hasDocs || Boolean(busy)} onClick={() => fillSuggestion(item)}>{item} <span>↗</span></button>)}
              </div>
            </section>
          </div>

          {(error || notice) && (
            <div className={"feedback " + (error ? "feedback-error" : "feedback-success")} role={error ? "alert" : "status"}>
              <span>{error ? "!" : "✓"}</span><p>{error || notice}</p>
              <button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button>
            </div>
          )}

          <section className="results" aria-label="Answers">
            <div className="results-heading"><div><span className="small-label">YOUR RESULTS</span><h2>Conversation insights</h2></div><div className="results-actions"><span>{conversations.length} {conversations.length === 1 ? "answer" : "answers"}</span>{conversations.length > 0 && <button type="button" onClick={() => setConversations([])}>Clear chat</button>}</div></div>
            {conversations.length === 0 ? (
              <div className="empty-state"><span className="empty-symbol">✳</span><strong>Your answers will appear here</strong><p>Upload a PDF and ask your first question to start exploring its contents.</p></div>
            ) : conversations.map((item) => (
              <article className="answer-card" key={item.id}>
                <div className="answer-header"><span className="answer-avatar">✦</span><span>DOCUMENT ASSISTANT</span><small>{item.seconds}s response</small></div>
                <h3>{item.question}</h3>
                <p className="answer-text">{item.answer}</p>
                {item.sources.length > 0 && <div className="sources"><strong>Referenced passages</strong><div className="source-grid">{item.sources.map((source, index) => <div className="source-card" key={index}><span>{source.filename || source.document || "Document"}{source.page ? " · Page " + source.page : ""}</span>{source.snippet && <p>{source.snippet}</p>}</div>)}</div></div>}
                <div className="answer-footer"><span>AI-generated — verify important details against the source.</span><button type="button" onClick={() => navigator.clipboard?.writeText(item.answer)}>Copy answer ↗</button></div>
              </article>
            ))}
          </section>

          <footer className="page-footer"><span>SourceLens · Document intelligence workspace</span><span>React · FastAPI · Semantic retrieval</span></footer>
        </div>
      </main>
    </div>
  );
}
