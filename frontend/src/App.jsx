import { useState } from "react";
import { askDocument, MAX_FILE_BYTES, uploadDocument } from "./api/documents";
import AnswerList from "./components/AnswerList";
import QuestionPanel from "./components/QuestionPanel";
import Sidebar from "./components/Sidebar";
import UploadPanel from "./components/UploadPanel";
import { getSessionId } from "./lib/session";
import "./App.css";

/** Coordinates the UI workflow; API transport and presentation live elsewhere. */
export default function App() {
  const [sessionId] = useState(getSessionId);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function chooseFile(file) {
    setError("");
    setNotice("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setError("Please select a PDF file. Audio and video support is planned, not available yet.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setError("This PDF is over the 10 MB upload limit.");
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setError("The selected PDF is empty.");
      return;
    }
    setSelectedFile(file);
  }

  async function uploadFile() {
    if (!selectedFile || busy) return;
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const data = await uploadDocument(selectedFile, sessionId);
      setDocuments((current) => [...current, {
        id: data.document_id || selectedFile.name + "-" + Date.now(),
        name: data.filename || selectedFile.name,
        chunks: Number.isFinite(data.chunks_added) ? data.chunks_added : null,
        size: selectedFile.size,
      }]);
      setSelectedFile(null);
      setNotice("Document indexed. You can now ask questions about its contents.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload this document.");
    } finally {
      setBusy("");
    }
  }

  async function askQuestion() {
    const prompt = question.trim();
    if (!prompt || documents.length === 0 || busy) return;
    setBusy("ask");
    setError("");
    setNotice("");
    try {
      const data = await askDocument(prompt, sessionId);
      setConversations((current) => [{
        id: Date.now() + Math.random(),
        question: prompt,
        answer: data.answer || "No answer was returned.",
        sources: Array.isArray(data.sources) ? data.sources : [],
        seconds: data.seconds,
      }, ...current]);
      setQuestion("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the question-answering service.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="shell">
      <Sidebar documents={documents} />
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

          <div className="privacy-banner" role="note">
            <span>ⓘ</span><p><strong>Public demo:</strong> Please use non-sensitive PDFs only. Documents are processed by a separate hosted API without user accounts or durable privacy controls.</p>
          </div>

          <div className="studio-grid">
            <UploadPanel selectedFile={selectedFile} onSelect={chooseFile} onUpload={uploadFile} busy={busy} />
            <QuestionPanel hasDocs={documents.length > 0} question={question} onChange={setQuestion} onAsk={askQuestion} busy={busy} />
          </div>

          {(error || notice) && (
            <div className={"feedback " + (error ? "feedback-error" : "feedback-success")} role={error ? "alert" : "status"}>
              <span>{error ? "!" : "✓"}</span><p>{error || notice}</p>
              <button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button>
            </div>
          )}

          <AnswerList conversations={conversations} onClear={() => setConversations([])} />
          <footer className="page-footer"><span>SourceLens · Document intelligence workspace</span><span>React · FastAPI · Semantic retrieval</span></footer>
        </div>
      </main>
    </div>
  );
}
