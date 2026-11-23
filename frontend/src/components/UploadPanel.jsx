import { useEffect, useRef, useState } from "react";

export default function UploadPanel({ selectedFile, onSelect, onUpload, busy }) {
  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!selectedFile && fileInput.current) fileInput.current.value = "";
  }, [selectedFile]);

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!busy) onSelect(event.dataTransfer.files?.[0]);
  }

  return (
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
          onChange={(event) => onSelect(event.target.files?.[0])}
          disabled={Boolean(busy)}
        />
        <button className="browse-button" type="button" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}>
          Browse files <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="upload-footer"><span>PDF only</span><span>Max 10 MB</span><span>Searchable text required</span></div>
      <button className="primary-button upload-button" type="button" onClick={onUpload} disabled={!selectedFile || Boolean(busy)}>
        {busy === "upload" ? <><span className="spinner" /> Processing document...</> : <>Index document <span aria-hidden="true">→</span></>}
      </button>
    </section>
  );
}
