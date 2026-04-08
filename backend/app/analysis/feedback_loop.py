import json
from typing import Any


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _append_unique(items: list[str], value: str) -> None:
    value = _safe_text(value)
    if value and value not in items:
        items.append(value)


def select_refinement_targets(
    analysis: dict,
    evaluation: dict,
    max_items: int = 3,
) -> dict:
    feedback = evaluation.get("feedback", {}) or {}
    issue_tags = _safe_list(feedback.get("issue_tags"))
    section_scores = feedback.get("section_scores", {}) or {}
    refinement_instructions = _safe_list(feedback.get("refinement_instructions"))

    candidate_sections = {
        "strengths": float(section_scores.get("strengths", 100)),
        "gaps": float(section_scores.get("gaps", 100)),
        "required_documents": float(section_scores.get("required_documents", 100)),
        "detailed_summary": float(section_scores.get("summary", 100)),
        "criterion_breakdown": float(section_scores.get("criteria", 100)),
    }

    ordered_sections = sorted(candidate_sections.items(), key=lambda x: x[1])
    targets = [name for name, _ in ordered_sections[:max_items]]

    # map issue tags to sections
    tag_map = {
        "missing_strengths": "strengths",
        "missing_gaps": "gaps",
        "missing_documents": "required_documents",
        "weak_summary": "detailed_summary",
        "weak_risk_analysis": "gaps",
        "weak_criteria_breakdown": "criterion_breakdown",
    }

    for tag in issue_tags:
        mapped = tag_map.get(tag)
        if mapped and mapped not in targets:
            targets.append(mapped)

    instructions = []
    for item in refinement_instructions[:max_items]:
        _append_unique(instructions, item)

    return {
        "targets": targets[:max_items],
        "instructions": instructions[:max_items] if instructions else [
            "Improve the lowest-scoring sections only.",
            "Do not rewrite strong sections.",
            "Keep the response candidate-specific and evidence-based.",
        ],
    }


def build_short_candidate_summary(candidate_payload: dict) -> str:
    candidate = candidate_payload.get("candidate", {}) or {}
    achievements = candidate_payload.get("achievements", {}) or {}
    evidence = candidate_payload.get("evidence_flags", {}) or {}

    return (
        f"Candidate: {candidate.get('full_name', 'Unknown')}. "
        f"Role: {candidate.get('current_role', 'Unknown')}. "
        f"Company: {candidate.get('current_company', 'Unknown')}. "
        f"Experience: {candidate.get('years_of_experience', 'Unknown')} years. "
        f"Publications: {achievements.get('publications_count', 0)}. "
        f"Patents: {achievements.get('patents_count', 0)}. "
        f"Awards: {achievements.get('awards_count', 0)}. "
        f"Reco letters: {achievements.get('recommendation_letters_count', 0)}. "
        f"Speaking: {achievements.get('speaking_engagements_count', 0)}. "
        f"Media: {achievements.get('media_mentions_count', 0)}. "
        f"Original contributions: {evidence.get('has_original_contributions', False)}. "
        f"Leadership: {evidence.get('has_leadership_role', False)}. "
        f"Judging: {evidence.get('has_judging_experience', False)}."
    )


def build_refinement_prompt(
    *,
    candidate_payload: dict,
    current_analysis: dict,
    evaluation: dict,
    context_chunks: list[str],
    targets: list[str],
    instructions: list[str],
) -> str:
    short_candidate = build_short_candidate_summary(candidate_payload)
    short_context = "\n\n---\n\n".join(context_chunks[:2]) if context_chunks else "No policy context retrieved."

    reduced_analysis = {
        "analysis_overview": current_analysis.get("analysis_overview", {}),
        "candidate_profile_summary": current_analysis.get("candidate_profile_summary", ""),
        "required_documents": current_analysis.get("required_documents", [])[:5],
        "criterion_breakdown": current_analysis.get("criterion_breakdown", [])[:5],
        "strategic_next_steps": current_analysis.get("strategic_next_steps", [])[:5],
        "detailed_summary": current_analysis.get("detailed_summary", ""),
    }

    evaluation_feedback = evaluation.get("feedback", {}) or {}

    return f"""
You are refining a previous O-1 analysis for a small local model environment.

Do not rewrite everything.
Only improve these target sections:
{json.dumps(targets)}

Follow these instructions:
{json.dumps(instructions, indent=2)}

Use only:
1. short candidate summary
2. short policy context
3. current analysis
4. evaluator feedback

Do not invent facts.
Return only valid JSON.

Return a PATCH JSON with only these possible keys:
{{
  "analysis_overview": {{
    "strengths": [],
    "gaps": [],
    "key_risks": []
  }},
  "required_documents": [],
  "criterion_breakdown": [],
  "strategic_next_steps": [],
  "detailed_summary": ""
}}

Short Candidate Summary:
{short_candidate}

Short Policy Context:
{short_context}

Current Analysis:
{json.dumps(reduced_analysis, indent=2, ensure_ascii=False)}

Evaluator Feedback:
{json.dumps(evaluation_feedback, indent=2, ensure_ascii=False)}
""".strip()


def merge_analysis_patch(base_analysis: dict, patch: dict) -> dict:
    merged = json.loads(json.dumps(base_analysis))

    if not isinstance(patch, dict):
        return merged

    if "analysis_overview" in patch and isinstance(patch["analysis_overview"], dict):
        merged.setdefault("analysis_overview", {})
        for key in ["strengths", "gaps", "key_risks"]:
            if key in patch["analysis_overview"] and isinstance(patch["analysis_overview"][key], list):
                merged["analysis_overview"][key] = patch["analysis_overview"][key]

    if "required_documents" in patch and isinstance(patch["required_documents"], list):
        merged["required_documents"] = patch["required_documents"]

    if "criterion_breakdown" in patch and isinstance(patch["criterion_breakdown"], list):
        merged["criterion_breakdown"] = patch["criterion_breakdown"]

    if "strategic_next_steps" in patch and isinstance(patch["strategic_next_steps"], list):
        merged["strategic_next_steps"] = patch["strategic_next_steps"]

    if "detailed_summary" in patch and isinstance(patch["detailed_summary"], str):
        merged["detailed_summary"] = patch["detailed_summary"]

    return merged