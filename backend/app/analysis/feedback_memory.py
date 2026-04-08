from app.db.crud import upsert_prompt_memory


ISSUE_TAG_TO_INSTRUCTION = {
    "missing_strengths": "Always provide at least 3 candidate-specific strengths when supported by the record.",
    "missing_gaps": "Always provide clear candidate-specific gaps and weaknesses rather than generic statements.",
    "missing_documents": "Provide a detailed and expanded required documents list tied to the candidate's actual evidence categories.",
    "weak_summary": "Write a structured summary that clearly explains how the candidate's evidence maps to O-1 style reasoning.",
    "weak_policy_grounding": "Explain evidence in a stricter O-1 style evidentiary framing rather than broad profile praise.",
    "weak_candidate_specificity": "Make all major observations explicitly tied to the candidate's actual publications, patents, awards, media, work, or other profile evidence.",
    "weak_risk_analysis": "Always include specific key risks based on missing or weak evidence areas.",
    "weak_criteria_breakdown": "Provide a criterion-level breakdown that explains evidence found, why it matters, and what is missing.",
}


def update_prompt_memory_from_evaluation(db, evaluation: dict) -> None:
    feedback = evaluation.get("feedback", {}) or {}
    issue_tags = feedback.get("issue_tags", []) or []

    for tag in issue_tags:
        instruction = ISSUE_TAG_TO_INSTRUCTION.get(tag)
        if not instruction:
            continue

        upsert_prompt_memory(
            db,
            source_type="evaluation_pattern",
            source_key=tag,
            instruction_text=instruction,
            memory_scope="global",
            weight_increment=1.0,
        )