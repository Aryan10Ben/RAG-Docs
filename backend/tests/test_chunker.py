import pytest

from app.services.chunker import chunk_text


def test_empty_document():
    assert chunk_text("") == []


def test_overlapping_windows():
    assert chunk_text("one two three four five", size=3, overlap=1) == [
        "one two three",
        "three four five",
        "five",
    ]


@pytest.mark.parametrize("size,overlap", [(0, 0), (3, 3), (3, 4), (3, -1)])
def test_invalid_settings(size, overlap):
    with pytest.raises(ValueError):
        chunk_text("one two three", size=size, overlap=overlap)
