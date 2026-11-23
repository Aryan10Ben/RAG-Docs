export default function Sidebar({ documents }) {
  return (
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
  );
}
