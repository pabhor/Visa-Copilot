from app.db.crud import get_active_prompt_memory


def build_global_memory_instructions(db) -> list[str]:
    rows = get_active_prompt_memory(db, memory_scope="global", limit=8)
    return [row.instruction_text for row in rows if row.instruction_text]