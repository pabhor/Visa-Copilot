import json

ANALYSIS_PROMPT_VERSION = "o1_analysis_v5"
EVALUATION_PROMPT_VERSION = "o1_evaluation_v3"
REFINEMENT_PROMPT_VERSION = "o1_refinement_patch_v1"


def build_analysis_prompt(candidate_payload: dict, context_chunks: list[str], memory_instructions: list[str]) -> str:
    policy_context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No policy context retrieved."
    candidate_json = json.dumps(candidate_payload, indent=2, ensure_ascii=False)
    memory_text = "\n".join(f"- {x}" for x in memory_instructions) if memory_instructions else "- No additional memory instructions."

    return f"""
You are an AI assistant for O-1 visa screening.

Use only the candidate profile and policy context.
Do not evaluate H-1B.
Do not recommend other visa paths.
Do not invent facts.
Return only valid JSON.

Global prompt memory instructions:
{memory_text}

Return this exact structure:
{{
  "analysis_overview": {{
    "readiness_score": 0,
    "case_assessment": "",
    "strengths": [],
    "gaps": [],
    "key_risks": []
  }},
  "candidate_profile_summary": "",
  "required_documents": [
    {{
      "document_name": "",
      "description": "",
      "tie_to_candidate_profile": "",
      "priority": "high"
    }}
  ],
  "criterion_breakdown": [
    {{
      "criterion": "",
      "status": "strong|moderate|weak|insufficient",
      "evidence_found": "",
      "why_it_matters": "",
      "improvement_steps": ""
    }}
  ],
  "strategic_next_steps": [],
  "detailed_summary": ""
}}

Rules:
- provide at least 3 candidate-specific strengths when possible
- provide all major candidate-specific gaps
- expand required documents in a candidate-specific way
- make the summary evidence-based, not generic

Policy Context:
{policy_context}

Candidate Profile:
{candidate_json}
""".strip()


def build_evaluation_prompt(
    candidate_payload: dict,
    context_chunks: list[str],
    analysis_output: dict,
) -> str:
    policy_context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No policy context retrieved."
    candidate_json = json.dumps(candidate_payload, indent=2, ensure_ascii=False)
    analysis_json = json.dumps(analysis_output, indent=2, ensure_ascii=False)

    return f"""
You are an evaluator model.

Evaluate the quality of the O-1 analysis output.
Do not generate a new analysis.
Return only valid JSON.

Return this exact structure:
{{
  "overall_score": 0,
  "policy_alignment": 0,
  "factual_grounding": 0,
  "completeness": 0,
  "structure_quality": 0,
  "feedback": {{
    "strengths": [],
    "issues": [],
    "missing_points": [],
    "refinement_instructions": [],
    "issue_tags": [],
    "section_scores": {{
      "strengths": 0,
      "gaps": 0,
      "required_documents": 0,
      "summary": 0,
      "criteria": 0
    }}
  }}
}}

Possible issue_tags:
- missing_strengths
- missing_gaps
- missing_documents
- weak_summary
- weak_policy_grounding
- weak_candidate_specificity
- weak_risk_analysis
- weak_criteria_breakdown

Use only:
1. policy context
2. candidate profile
3. analysis output

Policy Context:
{policy_context}

Candidate Profile:
{candidate_json}

Analysis Output:
{analysis_json}
""".strip()