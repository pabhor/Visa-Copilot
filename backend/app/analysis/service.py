import os
from pathlib import Path

from sqlalchemy.orm import Session

from app.analysis.feedback_loop import (
    build_refinement_prompt,
    merge_analysis_patch,
    select_refinement_targets,
)
from app.analysis.feedback_memory import update_prompt_memory_from_evaluation
from app.analysis.llm_client import (
    call_gemini_evaluator,
    call_ollama_analysis,
    call_ollama_patch,
)
from app.analysis.prompt_builder import build_global_memory_instructions
from app.analysis.prompts import (
    ANALYSIS_PROMPT_VERSION,
    EVALUATION_PROMPT_VERSION,
    REFINEMENT_PROMPT_VERSION,
    build_analysis_prompt,
    build_evaluation_prompt,
)
from app.analysis.retriever import KnowledgeBase, load_and_chunk_document
from app.db.crud import (
    clear_final_selection_for_candidate,
    create_analysis_run,
    create_evaluation_run,
    get_analysis_runs_for_candidate,
    mark_analysis_run_as_final,
)

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_KB_PATH = BASE_DIR / "data" / "O1visa_knowledgebase.pdf"


def _get_kb_path() -> Path:
    env_path = os.getenv("KNOWLEDGE_BASE_PATH", "").strip()
    if env_path:
        return Path(env_path)
    return DEFAULT_KB_PATH


def _build_knowledge_base() -> KnowledgeBase | None:
    kb_path = _get_kb_path()
    try:
        if not kb_path.exists():
            print(f"[WARN] Knowledge base file not found: {kb_path}")
            return None

        chunks = load_and_chunk_document(str(kb_path))
        return KnowledgeBase(chunks)
    except Exception as e:
        print(f"[WARN] Failed to load knowledge base: {e}")
        return None


_kb = _build_knowledge_base()


def _build_query(candidate_payload: dict) -> str:
    candidate = candidate_payload.get("candidate", {}) or {}
    achievements = candidate_payload.get("achievements", {}) or {}

    return (
        f"O1 visa analysis for {candidate.get('current_role', '')}. "
        f"Publications {achievements.get('publications_count', 0)}, "
        f"Awards {achievements.get('awards_count', 0)}, "
        f"Patents {achievements.get('patents_count', 0)}, "
        f"Media {achievements.get('media_mentions_count', 0)}"
    )


def _lightweight_context(chunks: list[str], max_chars_per_chunk: int = 250) -> list[str]:
    output = []
    for chunk in chunks:
        if isinstance(chunk, str):
            clean = chunk.strip()
            if clean:
                output.append(clean[:max_chars_per_chunk])
    return output


def _safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _bool_flag(value) -> bool:
    return bool(value)


def _append_unique(items: list[str], value: str):
    value = (value or "").strip()
    if value and value not in items:
        items.append(value)


def _candidate_summary_from_payload(payload: dict) -> str:
    candidate = payload.get("candidate", {}) or {}
    education = payload.get("education", {}) or {}
    employer = payload.get("employer_context", {}) or {}
    achievements = payload.get("achievements", {}) or {}

    return (
        f"{candidate.get('full_name', 'The candidate')} is currently working as "
        f"{candidate.get('current_role', 'a professional')} at "
        f"{candidate.get('current_company', 'their current company')}. "
        f"They have approximately {candidate.get('years_of_experience', 'unknown')} years of experience, "
        f"a highest degree of {education.get('highest_degree', 'unspecified')} in "
        f"{education.get('field_of_study', 'an unspecified field')} from "
        f"{education.get('university', 'an unspecified institution')}. "
        f"The profile reports {achievements.get('publications_count', 0)} publications, "
        f"{achievements.get('patents_count', 0)} patents, "
        f"{achievements.get('awards_count', 0)} awards, "
        f"{achievements.get('recommendation_letters_count', 0)} recommendation letters, "
        f"{achievements.get('speaking_engagements_count', 0)} speaking engagements, and "
        f"{achievements.get('media_mentions_count', 0)} media mentions."
    ).strip()


def _derive_strengths(payload: dict) -> list[str]:
    achievements = payload.get("achievements", {}) or {}
    evidence = payload.get("evidence_flags", {}) or {}
    candidate = payload.get("candidate", {}) or {}
    strengths = []

    if _safe_int(achievements.get("publications_count")) > 0:
        _append_unique(strengths, f"The profile includes {_safe_int(achievements.get('publications_count'))} publication(s), which supports a documented contribution narrative.")
    if _safe_int(achievements.get("awards_count")) > 0:
        _append_unique(strengths, f"The profile reports {_safe_int(achievements.get('awards_count'))} award(s), which may support external recognition.")
    if _safe_int(achievements.get("patents_count")) > 0:
        _append_unique(strengths, f"The candidate has {_safe_int(achievements.get('patents_count'))} patent(s), which may support originality if significance is documented.")
    if _safe_int(achievements.get("recommendation_letters_count")) > 0:
        _append_unique(strengths, f"The profile includes {_safe_int(achievements.get('recommendation_letters_count'))} recommendation letter(s), which can help substantiate impact and distinction.")
    if _safe_int(achievements.get("media_mentions_count")) > 0 or _bool_flag(evidence.get("has_media_coverage")):
        _append_unique(strengths, "The profile indicates media visibility, which may support external recognition if independently documented.")
    if _bool_flag(evidence.get("has_leadership_role")):
        _append_unique(strengths, f"The candidate appears to hold leadership responsibilities in the role of {candidate.get('current_role', 'a professional')}.")
    if _bool_flag(evidence.get("has_original_contributions")):
        _append_unique(strengths, "The profile explicitly identifies original contributions, which is an important O-1 style evidence theme.")
    if _bool_flag(evidence.get("has_judging_experience")):
        _append_unique(strengths, "Judging experience appears in the profile, which can support recognition as an expert.")
    return strengths[:8]


def _derive_gaps(payload: dict) -> list[str]:
    achievements = payload.get("achievements", {}) or {}
    evidence = payload.get("evidence_flags", {}) or {}
    gaps = []

    if _safe_int(achievements.get("awards_count")) <= 0:
        _append_unique(gaps, "The profile does not yet show strong award evidence.")
    if _safe_int(achievements.get("media_mentions_count")) <= 0 and not _bool_flag(evidence.get("has_media_coverage")):
        _append_unique(gaps, "Independent media coverage appears limited or absent.")
    if _safe_int(achievements.get("speaking_engagements_count")) <= 0:
        _append_unique(gaps, "The profile currently shows limited invited speaking or public professional visibility.")
    if _safe_int(achievements.get("recommendation_letters_count")) < 3:
        _append_unique(gaps, "The number of recommendation letters appears limited for a stronger evidentiary package.")
    if not _bool_flag(evidence.get("has_judging_experience")):
        _append_unique(gaps, "There is no clear judging or peer-review evidence shown in the current profile.")
    if not _bool_flag(evidence.get("has_original_contributions")):
        _append_unique(gaps, "The profile does not yet clearly document original contributions with objective proof of significance.")
    if not _bool_flag(evidence.get("has_critical_employment")):
        _append_unique(gaps, "The profile does not yet strongly document critical or essential employment in distinguished organizations.")
    return gaps[:10]


def _derive_risks(payload: dict) -> list[str]:
    risks = []
    for gap in _derive_gaps(payload)[:5]:
        _append_unique(risks, gap)
    return risks


def _derive_required_documents(payload: dict) -> list[dict]:
    candidate = payload.get("candidate", {}) or {}
    education = payload.get("education", {}) or {}
    employer = payload.get("employer_context", {}) or {}
    achievements = payload.get("achievements", {}) or {}
    evidence = payload.get("evidence_flags", {}) or {}

    docs = [
        {
            "document_name": "Detailed Resume or Curriculum Vitae",
            "description": "Provide a current CV covering technical work, leadership, publications, patents, awards, speaking, judging, and measurable project impact.",
            "tie_to_candidate_profile": f"This organizes the record of {candidate.get('full_name', 'the candidate')} into a structured evidentiary narrative.",
            "priority": "high",
        },
        {
            "document_name": "Degree Certificates and Academic Records",
            "description": "Provide degree certificates, transcripts, and supporting academic records.",
            "tie_to_candidate_profile": f"The profile lists {education.get('highest_degree', 'an academic degree')} in {education.get('field_of_study', 'a field of study')}.",
            "priority": "high",
        },
        {
            "document_name": "Employment Verification and Role Documentation",
            "description": "Collect offer letters, role descriptions, promotion records, reporting structure, and evidence showing why the candidate's role matters.",
            "tie_to_candidate_profile": f"This is relevant to the role at {candidate.get('current_company', employer.get('company_name', 'the employer'))}.",
            "priority": "high",
        },
    ]

    if _safe_int(achievements.get("publications_count")) > 0:
        docs.append({
            "document_name": "Publication Evidence Packet",
            "description": "Include papers, conference proceedings, DOI pages, citation metrics, publisher details, and authorship proof.",
            "tie_to_candidate_profile": f"The profile reports {_safe_int(achievements.get('publications_count'))} publication(s).",
            "priority": "high",
        })

    if _safe_int(achievements.get("patents_count")) > 0:
        docs.append({
            "document_name": "Patent and Innovation Evidence Packet",
            "description": "Include patent certificates, filing references, inventorship proof, implementation evidence, and significance explanation.",
            "tie_to_candidate_profile": f"The profile reports {_safe_int(achievements.get('patents_count'))} patent(s).",
            "priority": "high",
        })

    if _safe_int(achievements.get("awards_count")) > 0:
        docs.append({
            "document_name": "Awards and Honors Evidence Packet",
            "description": "Provide award certificates, issuer information, selection criteria, and evidence of prestige.",
            "tie_to_candidate_profile": f"The profile reports {_safe_int(achievements.get('awards_count'))} award(s).",
            "priority": "high",
        })

    if _safe_int(achievements.get("media_mentions_count")) > 0 or _bool_flag(evidence.get("has_media_coverage")):
        docs.append({
            "document_name": "Media Coverage and Press Packet",
            "description": "Collect independent articles, archive links, publication metadata, and evidence of outlet credibility.",
            "tie_to_candidate_profile": "The profile indicates media or press visibility.",
            "priority": "high",
        })

    docs.append({
        "document_name": "Recommendation Letter Package",
        "description": "Prepare strong letters from independent experts, collaborators, managers, or recognized professionals.",
        "tie_to_candidate_profile": f"The current profile lists {_safe_int(achievements.get('recommendation_letters_count'))} recommendation letter(s).",
        "priority": "high",
    })

    if _bool_flag(evidence.get("has_judging_experience")):
        docs.append({
            "document_name": "Judging or Peer Review Evidence",
            "description": "Provide review invitations, judging confirmations, editorial roles, or conference reviewer records.",
            "tie_to_candidate_profile": "This supports recognition as an expert trusted to evaluate others.",
            "priority": "medium",
        })

    if _bool_flag(evidence.get("has_original_contributions")):
        docs.append({
            "document_name": "Original Contributions Evidence Packet",
            "description": "Provide technical summaries, adoption metrics, product impact, citations, third-party references, and measurable outcomes.",
            "tie_to_candidate_profile": "The profile explicitly identifies original contributions.",
            "priority": "high",
        })

    if _bool_flag(evidence.get("has_high_salary")):
        docs.append({
            "document_name": "High Salary Benchmark Evidence",
            "description": "Provide salary records and independent market compensation benchmarks.",
            "tie_to_candidate_profile": "The profile indicates potentially high salary evidence.",
            "priority": "medium",
        })

    docs.append({
        "document_name": "Project Impact and Outcome Documentation",
        "description": "Collect dashboards, adoption data, business outcomes, engineering results, research outcomes, or technical impact summaries.",
        "tie_to_candidate_profile": "This helps prove the candidate's work had measurable significance.",
        "priority": "high",
    })

    return docs


def _derive_criteria(payload: dict) -> list[dict]:
    achievements = payload.get("achievements", {}) or {}
    evidence = payload.get("evidence_flags", {}) or {}

    return [
        {
            "criterion": "Awards or Recognized Prizes",
            "status": "strong" if _safe_int(achievements.get("awards_count")) > 0 else "insufficient",
            "evidence_found": f"Awards count reported: {_safe_int(achievements.get('awards_count'))}.",
            "why_it_matters": "Objective prior recognition by respected bodies can strengthen O-1 style reasoning.",
            "improvement_steps": "Document issuer prestige, selection criteria, and competitiveness.",
        },
        {
            "criterion": "Published Material or Media Recognition",
            "status": "strong" if _safe_int(achievements.get("media_mentions_count")) > 0 or _bool_flag(evidence.get("has_media_coverage")) else "insufficient",
            "evidence_found": f"Media mentions reported: {_safe_int(achievements.get('media_mentions_count'))}.",
            "why_it_matters": "Independent media recognition can support external recognition and visibility.",
            "improvement_steps": "Provide article copies, archive links, and outlet details.",
        },
        {
            "criterion": "Original Contributions of Significance",
            "status": "strong" if _bool_flag(evidence.get("has_original_contributions")) or _safe_int(achievements.get("patents_count")) > 0 else "insufficient",
            "evidence_found": f"Original contributions flag: {_bool_flag(evidence.get('has_original_contributions'))}; patents count: {_safe_int(achievements.get('patents_count'))}.",
            "why_it_matters": "Original contributions are often a major strength in O-1 style cases.",
            "improvement_steps": "Show novelty, adoption, impact, and third-party corroboration.",
        },
        {
            "criterion": "Authorship of Scholarly Articles",
            "status": "strong" if _safe_int(achievements.get("publications_count")) > 0 else "insufficient",
            "evidence_found": f"Publications count reported: {_safe_int(achievements.get('publications_count'))}.",
            "why_it_matters": "Authorship can support recognized contribution to the field.",
            "improvement_steps": "Provide copies, citations, authorship proof, and venue details.",
        },
        {
            "criterion": "Participation as a Judge of the Work of Others",
            "status": "strong" if _bool_flag(evidence.get("has_judging_experience")) else "insufficient",
            "evidence_found": f"Judging flag reported: {_bool_flag(evidence.get('has_judging_experience'))}.",
            "why_it_matters": "Judging evidence may support recognition as an expert.",
            "improvement_steps": "Provide invitations, reviewer records, and supporting proof.",
        },
        {
            "criterion": "Critical or Essential Role",
            "status": "strong" if _bool_flag(evidence.get("has_critical_employment")) or _bool_flag(evidence.get("has_leadership_role")) else "moderate",
            "evidence_found": f"Critical employment flag: {_bool_flag(evidence.get('has_critical_employment'))}; leadership flag: {_bool_flag(evidence.get('has_leadership_role'))}.",
            "why_it_matters": "A critical role in a distinguished organization can strengthen the case.",
            "improvement_steps": "Provide employer distinction proof, role criticality evidence, and measurable impact.",
        },
    ]


def _derive_next_steps(payload: dict) -> list[str]:
    return [
        "Organize all evidence into clear folders mapped to publications, patents, awards, recommendation letters, media, judging, and employment impact.",
        "Strengthen the record for original contributions by gathering measurable proof of significance and third-party validation.",
        "Improve the quality and independence of recommendation letters so they explain why the work stands out in the field.",
        "Build stronger proof that the employer is distinguished and that the candidate's role is important within the organization.",
    ]


def _compute_readiness_score(payload: dict) -> int:
    achievements = payload.get("achievements", {}) or {}
    evidence = payload.get("evidence_flags", {}) or {}

    publications = _safe_int(achievements.get("publications_count"))
    patents = _safe_int(achievements.get("patents_count"))
    awards = _safe_int(achievements.get("awards_count"))
    reco_letters = _safe_int(achievements.get("recommendation_letters_count"))
    speaking = _safe_int(achievements.get("speaking_engagements_count"))
    media = _safe_int(achievements.get("media_mentions_count"))

    has_high_salary = _bool_flag(evidence.get("has_high_salary"))
    has_leadership_role = _bool_flag(evidence.get("has_leadership_role"))
    has_judging_experience = _bool_flag(evidence.get("has_judging_experience"))
    has_critical_employment = _bool_flag(evidence.get("has_critical_employment"))
    has_original_contributions = _bool_flag(evidence.get("has_original_contributions"))
    has_media_coverage = _bool_flag(evidence.get("has_media_coverage"))

    score = 15

    if awards > 0:
        score += min(awards * 5, 10)
    if publications > 0:
        score += min(publications * 3, 9)
    if patents > 0:
        score += min(patents * 4, 8)
    if has_original_contributions:
        score += 10
    if has_judging_experience:
        score += 10
    if has_critical_employment:
        score += 8
    if has_leadership_role:
        score += 5
    if media > 0 or has_media_coverage:
        score += min(max(media, 1) * 3, 8)
    if speaking > 0:
        score += min(speaking * 2, 4)
    if has_high_salary:
        score += 5

    if reco_letters >= 5:
        score += 6
    elif reco_letters >= 3:
        score += 4
    elif reco_letters >= 1:
        score += 2

    weak_external_recognition = (awards == 0 and media == 0 and not has_media_coverage)
    weak_independent_validation = (reco_letters < 3 and not has_judging_experience)
    weak_major_significance = (not has_original_contributions and patents == 0)

    if weak_external_recognition:
        score -= 6
    if weak_independent_validation:
        score -= 5
    if weak_major_significance:
        score -= 5

    score = min(score, 65)

    return max(20, min(100, score))


def _build_case_assessment(score: int) -> str:
    if score >= 70:
        return "The profile shows several useful O-1 style indicators, but this should still be treated as a document-dependent case rather than a clearly strong one."
    if score >= 55:
        return "The profile contains promising evidence themes, but the case still needs stronger external proof, tighter documentation, and clearer substantiation of significance."
    if score >= 40:
        return "The profile has some potentially relevant O-1 style elements, but the current record looks underdeveloped and would need meaningful evidentiary strengthening."
    return "The current profile appears relatively weak for an O-1 style case unless significantly stronger external and well-documented evidence can be assembled."


def _build_detailed_summary(payload: dict, strengths: list[str], gaps: list[str], score: int) -> str:
    candidate = payload.get("candidate", {}) or {}
    achievements = payload.get("achievements", {}) or {}

    p1 = (
        f"{candidate.get('full_name', 'The candidate')} is currently presented as "
        f"{candidate.get('current_role', 'a professional')} with approximately "
        f"{candidate.get('years_of_experience', 'unknown')} years of experience. "
        f"The profile includes {_safe_int(achievements.get('publications_count'))} publication(s), "
        f"{_safe_int(achievements.get('patents_count'))} patent(s), "
        f"{_safe_int(achievements.get('awards_count'))} award(s), and "
        f"{_safe_int(achievements.get('recommendation_letters_count'))} recommendation letter(s). "
        f"Based on the currently available evidence, the estimated O-1 readiness score is {score}/100."
    )

    p2 = (
        f"The strongest parts of the profile are: {' '.join(strengths[:3]) if strengths else 'the currently documented strengths are limited.'} "
        f"From an O-1 evidentiary perspective, these points matter because the case depends on showing distinction, external recognition, and meaningful contribution in the field."
    )

    p3 = (
        f"The main weaknesses or open issues are: {' '.join(gaps[:4]) if gaps else 'no major gaps were identified from the provided data.'} "
        f"To improve the case, the candidate should focus on stronger documentation for impact, recognition, and role significance, while organizing the evidence into clear categories such as publications, patents, awards, recommendation letters, media, and employment records."
    )

    return f"{p1}\n\n{p2}\n\n{p3}"


def _enrich_analysis(candidate_payload: dict, analysis: dict) -> dict:
    overview = analysis.get("analysis_overview", {}) or {}
    strengths = [x for x in (overview.get("strengths") or []) if str(x).strip()]
    gaps = [x for x in (overview.get("gaps") or []) if str(x).strip()]
    key_risks = [x for x in (overview.get("key_risks") or []) if str(x).strip()]
    required_documents = analysis.get("required_documents") or []
    criterion_breakdown = analysis.get("criterion_breakdown") or []
    strategic_next_steps = analysis.get("strategic_next_steps") or []
    candidate_profile_summary = (analysis.get("candidate_profile_summary") or "").strip()
    detailed_summary = (analysis.get("detailed_summary") or "").strip()

    derived_strengths = _derive_strengths(candidate_payload)
    derived_gaps = _derive_gaps(candidate_payload)
    derived_risks = _derive_risks(candidate_payload)
    derived_docs = _derive_required_documents(candidate_payload)
    derived_criteria = _derive_criteria(candidate_payload)
    derived_steps = _derive_next_steps(candidate_payload)

    for s in derived_strengths:
        _append_unique(strengths, s)
    for g in derived_gaps:
        _append_unique(gaps, g)
    for r in derived_risks:
        _append_unique(key_risks, r)

    if not required_documents or len(required_documents) < 6:
        required_documents = derived_docs
    if not criterion_breakdown or len(criterion_breakdown) < 5:
        criterion_breakdown = derived_criteria
    if not strategic_next_steps or len(strategic_next_steps) < 3:
        strategic_next_steps = derived_steps

    if not candidate_profile_summary:
        candidate_profile_summary = _candidate_summary_from_payload(candidate_payload)

    score = _safe_int(overview.get("readiness_score"), 0)
    if score == 0:
        score = _compute_readiness_score(candidate_payload)

    case_assessment = (overview.get("case_assessment") or "").strip()
    if not case_assessment:
        case_assessment = _build_case_assessment(score)

    if not detailed_summary or len(detailed_summary.split()) < 80:
        detailed_summary = _build_detailed_summary(candidate_payload, strengths, gaps, score)

    if len(strengths) < 3:
        for s in derived_strengths:
            _append_unique(strengths, s)

    return {
        "analysis_overview": {
            "readiness_score": score,
            "case_assessment": case_assessment,
            "strengths": strengths[:8],
            "gaps": gaps[:10],
            "key_risks": key_risks[:8],
        },
        "candidate_profile_summary": candidate_profile_summary,
        "required_documents": required_documents,
        "criterion_breakdown": criterion_breakdown,
        "strategic_next_steps": strategic_next_steps[:8],
        "detailed_summary": detailed_summary,
    }


def analyze_candidate_profile_with_persistence(
    db: Session,
    *,
    candidate_id: int,
    candidate_payload: dict,
    visa_type: str = "O1",
) -> dict:
    if not isinstance(candidate_payload, dict):
        raise ValueError("candidate_payload must be a dictionary")

    query = _build_query(candidate_payload)
    context_chunks = _kb.search(query, k=2) if _kb else []
    context_chunks = _lightweight_context(context_chunks, max_chars_per_chunk=250)

    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    memory_instructions = build_global_memory_instructions(db)

    initial_prompt = build_analysis_prompt(
        candidate_payload=candidate_payload,
        context_chunks=context_chunks,
        memory_instructions=memory_instructions,
    )
    initial_analysis_raw = call_ollama_analysis(initial_prompt)
    initial_analysis = _enrich_analysis(candidate_payload, initial_analysis_raw)

    initial_run = create_analysis_run(
        db,
        candidate_id=candidate_id,
        parent_analysis_id=None,
        run_type="initial",
        visa_type=visa_type,
        generator_model=f"ollama:{ollama_model}",
        prompt_version=ANALYSIS_PROMPT_VERSION,
        retrieval_context_json=context_chunks,
        analysis_output_json=initial_analysis,
        selected_final=False,
    )

    initial_eval_prompt = build_evaluation_prompt(
        candidate_payload=candidate_payload,
        context_chunks=context_chunks,
        analysis_output=initial_analysis,
    )
    initial_evaluation = call_gemini_evaluator(initial_eval_prompt)

    create_evaluation_run(
        db,
        analysis_run_id=initial_run.id,
        evaluator_model=f"gemini:{gemini_model}",
        evaluation_prompt_version=EVALUATION_PROMPT_VERSION,
        overall_score=initial_evaluation["overall_score"],
        policy_alignment=initial_evaluation["policy_alignment"],
        factual_grounding=initial_evaluation["factual_grounding"],
        completeness=initial_evaluation["completeness"],
        structure_quality=initial_evaluation["structure_quality"],
        feedback_json=initial_evaluation["feedback"],
    )

    update_prompt_memory_from_evaluation(db, initial_evaluation)

    plan = select_refinement_targets(initial_analysis, initial_evaluation, max_items=3)

    refinement_prompt = build_refinement_prompt(
        candidate_payload=candidate_payload,
        current_analysis=initial_analysis,
        evaluation=initial_evaluation,
        context_chunks=context_chunks,
        targets=plan["targets"],
        instructions=plan["instructions"],
    )

    refinement_patch = call_ollama_patch(refinement_prompt)
    refined_analysis_raw = merge_analysis_patch(initial_analysis, refinement_patch)
    refined_analysis = _enrich_analysis(candidate_payload, refined_analysis_raw)

    refined_run = create_analysis_run(
        db,
        candidate_id=candidate_id,
        parent_analysis_id=initial_run.id,
        run_type="refined",
        visa_type=visa_type,
        generator_model=f"ollama:{ollama_model}",
        prompt_version=REFINEMENT_PROMPT_VERSION,
        retrieval_context_json=context_chunks,
        analysis_output_json=refined_analysis,
        selected_final=False,
    )

    refined_eval_prompt = build_evaluation_prompt(
        candidate_payload=candidate_payload,
        context_chunks=context_chunks,
        analysis_output=refined_analysis,
    )
    refined_evaluation = call_gemini_evaluator(refined_eval_prompt)

    create_evaluation_run(
        db,
        analysis_run_id=refined_run.id,
        evaluator_model=f"gemini:{gemini_model}",
        evaluation_prompt_version=EVALUATION_PROMPT_VERSION,
        overall_score=refined_evaluation["overall_score"],
        policy_alignment=refined_evaluation["policy_alignment"],
        factual_grounding=refined_evaluation["factual_grounding"],
        completeness=refined_evaluation["completeness"],
        structure_quality=refined_evaluation["structure_quality"],
        feedback_json=refined_evaluation["feedback"],
    )

    update_prompt_memory_from_evaluation(db, refined_evaluation)

    clear_final_selection_for_candidate(db, candidate_id)

    if refined_evaluation["overall_score"] >= initial_evaluation["overall_score"]:
        final_run = mark_analysis_run_as_final(db, refined_run.id)
        final_analysis = refined_analysis
        final_evaluation = refined_evaluation
    else:
        final_run = mark_analysis_run_as_final(db, initial_run.id)
        final_analysis = initial_analysis
        final_evaluation = initial_evaluation

    history = get_analysis_runs_for_candidate(db, candidate_id)

    return {
        "analysis": final_analysis,
        "retrieved_context": context_chunks,
        "analysis_meta": {
            "generator_model": f"ollama:{ollama_model}",
            "evaluator_model": f"gemini:{gemini_model}",
            "knowledge_base_loaded": _kb is not None,
            "retrieved_chunks_count": len(context_chunks),
            "selected_final_run_id": final_run.id if final_run else None,
            "pipeline_mode": "two_level_feedback_loop_enriched",
            "global_memory_instructions_count": len(memory_instructions),
        },
        "evaluation": final_evaluation,
        "run_history": [
            {
                "analysis_run_id": run.id,
                "run_type": run.run_type,
                "generator_model": run.generator_model,
                "prompt_version": run.prompt_version,
                "selected_final": run.selected_final,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "evaluation": [
                    {
                        "evaluation_run_id": ev.id,
                        "overall_score": float(ev.overall_score),
                        "policy_alignment": float(ev.policy_alignment),
                        "factual_grounding": float(ev.factual_grounding),
                        "completeness": float(ev.completeness),
                        "structure_quality": float(ev.structure_quality),
                        "created_at": ev.created_at.isoformat() if ev.created_at else None,
                    }
                    for ev in run.evaluations
                ],
            }
            for run in history
        ],
    }