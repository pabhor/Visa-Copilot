from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.analysis.service import analyze_candidate_profile_with_persistence
from app.db.crud import get_analysis_runs_for_candidate, get_candidate_profile
from app.db.database import get_db

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/candidate/{profile_id}/run")
def analyze_candidate_with_history(profile_id: int, db: Session = Depends(get_db)):
    profile = get_candidate_profile(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    return analyze_candidate_profile_with_persistence(
        db,
        candidate_id=profile.id,
        candidate_payload=profile.payload,
        visa_type="O1",
    )


@router.get("/candidate/{profile_id}/history")
def get_candidate_analysis_history(profile_id: int, db: Session = Depends(get_db)):
    profile = get_candidate_profile(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    runs = get_analysis_runs_for_candidate(db, profile.id)

    return {
        "profile_id": profile.id,
        "candidate_name": profile.candidate_name,
        "runs": [
            {
                "analysis_run_id": run.id,
                "run_type": run.run_type,
                "generator_model": run.generator_model,
                "prompt_version": run.prompt_version,
                "selected_final": run.selected_final,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "analysis_output_json": run.analysis_output_json,
                "retrieval_context_json": run.retrieval_context_json,
                "evaluations": [
                    {
                        "evaluation_run_id": ev.id,
                        "evaluator_model": ev.evaluator_model,
                        "evaluation_prompt_version": ev.evaluation_prompt_version,
                        "overall_score": float(ev.overall_score),
                        "policy_alignment": float(ev.policy_alignment),
                        "factual_grounding": float(ev.factual_grounding),
                        "completeness": float(ev.completeness),
                        "structure_quality": float(ev.structure_quality),
                        "feedback_json": ev.feedback_json,
                        "created_at": ev.created_at.isoformat() if ev.created_at else None,
                    }
                    for ev in run.evaluations
                ],
            }
            for run in runs
        ],
    }