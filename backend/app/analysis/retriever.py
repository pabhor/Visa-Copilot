from pathlib import Path

import faiss
import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")


def _read_document(path: Path) -> str:
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()

    if suffix in {".txt", ".md"}:
        try:
            return path.read_text(encoding="utf-8").strip()
        except UnicodeDecodeError:
            return path.read_text(encoding="cp1252").strip()

    raise ValueError(f"Unsupported file type: {suffix}. Use .pdf, .txt, or .md")


def load_and_chunk_document(file_path: str) -> list[str]:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Knowledge base file not found: {file_path}")

    text = _read_document(path)

    if not text:
        raise ValueError(f"No readable text found in document: {file_path}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=350,
        chunk_overlap=70,
    )
    chunks = splitter.split_text(text)
    cleaned_chunks = [chunk.strip() for chunk in chunks if chunk.strip()]

    if not cleaned_chunks:
        raise ValueError(f"No valid chunks created from document: {file_path}")

    return cleaned_chunks


class KnowledgeBase:
    def __init__(self, chunks: list[str]):
        if not chunks:
            raise ValueError("KnowledgeBase cannot be created with empty chunks.")

        self.chunks = chunks
        self.embeddings = EMBED_MODEL.encode(chunks)
        self.index = faiss.IndexFlatL2(len(self.embeddings[0]))
        self.index.add(np.array(self.embeddings, dtype="float32"))

    def search(self, query: str, k: int = 4) -> list[str]:
        if not query.strip():
            return []

        query_vec = EMBED_MODEL.encode([query])
        _, indices = self.index.search(
            np.array(query_vec, dtype="float32"),
            min(k, len(self.chunks)),
        )
        return [self.chunks[i] for i in indices[0] if 0 <= i < len(self.chunks)]