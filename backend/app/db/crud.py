from sqlalchemy.orm import Session
from app.db.models import CandidateProfile
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