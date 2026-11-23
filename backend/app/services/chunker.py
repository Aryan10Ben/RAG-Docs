def chunk_text(text: str, size: int = 400, overlap: int = 50):
    """Split words into overlapping windows.

    A word-based splitter is intentionally simple; section-aware chunking can
    be evaluated against it later.
    """
    if size < 1 or overlap < 0 or overlap >= size:
        raise ValueError("Require size > 0 and 0 <= overlap < size.")

    words = text.split()
    return [
        " ".join(words[start:start + size])
        for start in range(0, len(words), size - overlap)
    ]
