from sqlalchemy.orm import Session, joinedload

from app.db.models import CandidateProfile, AnalysisRun, EvaluationRun, PromptMemory
from app.db.schemas import CandidateProfileCreate


def create_candidate_profile(db: Session, profile: CandidateProfileCreate) -> CandidateProfile:
    payload_dict = profile.model_dump()

    db_profile = CandidateProfile(
        candidate_name=profile.candidate.full_name,
        candidate_email=profile.candidate.email,
        current_role=profile.candidate.current_role,
        visa_type=profile.meta.visa_type,
        employer_name=profile.employer_context.company_name,
        h1b_wage_band=profile.employer_context.h1b_wage_band,
        payload=payload_dict,
    )

    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def list_candidate_profiles(db: Session) -> list[CandidateProfile]:
    return db.query(CandidateProfile).order_by(CandidateProfile.created_at.desc()).all()


def get_candidate_profile(db: Session, profile_id: int):
    return db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()


def create_analysis_run(
    db: Session,
    *,
    candidate_id: int,
    parent_analysis_id: int | None,
    run_type: str,
    visa_type: str,
    generator_model: str,
    prompt_version: str,
    retrieval_context_json: list,
    analysis_output_json: dict,
    selected_final: bool = False,
) -> AnalysisRun:
    analysis_run = AnalysisRun(
        candidate_id=candidate_id,
        parent_analysis_id=parent_analysis_id,
        run_type=run_type,
        visa_type=visa_type,
        generator_model=generator_model,
        prompt_version=prompt_version,
        retrieval_context_json=retrieval_context_json,
        analysis_output_json=analysis_output_json,
        selected_final=selected_final,
    )

    db.add(analysis_run)
    db.commit()
    db.refresh(analysis_run)
    return analysis_run


def create_evaluation_run(
    db: Session,
    *,
    analysis_run_id: int,
    evaluator_model: str,
    evaluation_prompt_version: str,
    overall_score: float,
    policy_alignment: float,
    factual_grounding: float,
    completeness: float,
    structure_quality: float,
    feedback_json: dict,
) -> EvaluationRun:
    evaluation_run = EvaluationRun(
        analysis_run_id=analysis_run_id,
        evaluator_model=evaluator_model,
        evaluation_prompt_version=evaluation_prompt_version,
        overall_score=overall_score,
        policy_alignment=policy_alignment,
        factual_grounding=factual_grounding,
        completeness=completeness,
        structure_quality=structure_quality,
        feedback_json=feedback_json,
    )

    db.add(evaluation_run)
    db.commit()
    db.refresh(evaluation_run)
    return evaluation_run


def clear_final_selection_for_candidate(db: Session, candidate_id: int) -> None:
    runs = db.query(AnalysisRun).filter(AnalysisRun.candidate_id == candidate_id).all()
    for run in runs:
        run.selected_final = False
    db.commit()


def mark_analysis_run_as_final(db: Session, analysis_run_id: int):
    run = db.query(AnalysisRun).filter(AnalysisRun.id == analysis_run_id).first()
    if not run:
        return None

    run.selected_final = True
    db.commit()
    db.refresh(run)
    return run


def get_analysis_runs_for_candidate(db: Session, candidate_id: int) -> list[AnalysisRun]:
    return (
        db.query(AnalysisRun)
        .options(joinedload(AnalysisRun.evaluations))
        .filter(AnalysisRun.candidate_id == candidate_id)
        .order_by(AnalysisRun.created_at.desc())
        .all()
    )


def get_final_analysis_run_for_candidate(db: Session, candidate_id: int):
    return (
        db.query(AnalysisRun)
        .options(joinedload(AnalysisRun.evaluations))
        .filter(
            AnalysisRun.candidate_id == candidate_id,
            AnalysisRun.selected_final.is_(True),
        )
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )


def upsert_prompt_memory(
    db: Session,
    *,
    source_type: str,
    source_key: str,
    instruction_text: str,
    memory_scope: str = "global",
    weight_increment: float = 1.0,
) -> PromptMemory:
    row = (
        db.query(PromptMemory)
        .filter(
            PromptMemory.memory_scope == memory_scope,
            PromptMemory.source_type == source_type,
            PromptMemory.source_key == source_key,
            PromptMemory.is_active.is_(True),
        )
        .first()
    )

    if row:
        row.weight = float(row.weight) + float(weight_increment)
        row.instruction_text = instruction_text
    else:
        row = PromptMemory(
            memory_scope=memory_scope,
            source_type=source_type,
            source_key=source_key,
            instruction_text=instruction_text,
            weight=weight_increment,
            is_active=True,
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return row


def get_active_prompt_memory(
    db: Session,
    *,
    memory_scope: str = "global",
    limit: int = 8,
) -> list[PromptMemory]:
    return (
        db.query(PromptMemory)
        .filter(
            PromptMemory.memory_scope == memory_scope,
            PromptMemory.is_active.is_(True),
        )
        .order_by(PromptMemory.weight.desc(), PromptMemory.updated_at.desc())
        .limit(limit)
        .all()
    )