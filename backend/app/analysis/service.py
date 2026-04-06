from pathlib import Path

from app.analysis.retriever import KnowledgeBase, load_and_chunk_document
from app.analysis.prompts import build_analysis_prompt
from app.analysis.llm_client import call_ollama

BASE_DIR = Path(__file__).resolve().parents[2]
KB_PATH = BASE_DIR / "data" / "O1visa_knowledgebase.pdf"


def _build_knowledge_base() -> KnowledgeBase | None:
    try:
        if not KB_PATH.exists():
            print(f"[WARN] Knowledge base file not found: {KB_PATH}")
            return None

        chunks = load_and_chunk_document(str(KB_PATH))
        return KnowledgeBase(chunks)

    except Exception as e:
        print(f"[WARN] Failed to load knowledge base: {e}")
        return None


_kb = _build_knowledge_base()


def analyze_candidate_payload(candidate_payload: dict) -> dict:
    query = (
        f"O-1 extraordinary ability analysis for role "
        f"{candidate_payload.get('candidate', {}).get('current_role', '')} "
        f"with publications, awards, media, salary, leadership, and contributions"
    )

    context_chunks = _kb.search(query, k=2) if _kb else []
    prompt = build_analysis_prompt(candidate_payload, context_chunks)
    result = call_ollama(prompt)

    return {
        "analysis": result,
        "retrieved_context": context_chunks,
    }