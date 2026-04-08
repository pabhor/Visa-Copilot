from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.routes.analysis import router as analysis_router
from app.analysis.service import analyze_candidate_profile_with_persistence
from app.db.base import init_db
from app.db.crud import (
    create_candidate_profile,
    list_candidate_profiles,
    get_candidate_profile,
)
from app.db.database import get_db
from app.db.schemas import CandidateProfileCreate, CandidateProfileResponse

app = FastAPI(title="Visa Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/candidate-profiles", response_model=CandidateProfileResponse)
def submit_candidate_profile(
    profile: CandidateProfileCreate,
    db: Session = Depends(get_db),
):
    return create_candidate_profile(db, profile)


@app.get("/api/candidate-profiles", response_model=list[CandidateProfileResponse])
def get_candidate_profiles(db: Session = Depends(get_db)):
    return list_candidate_profiles(db)


@app.get("/api/candidate-profiles/{profile_id}", response_model=CandidateProfileResponse)
def get_candidate_profile_by_id(profile_id: int, db: Session = Depends(get_db)):
    profile = get_candidate_profile(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return profile


@app.post("/api/candidate-profiles/{profile_id}/analyze")
def analyze_candidate_by_id(profile_id: int, db: Session = Depends(get_db)):
    profile = get_candidate_profile(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    result = analyze_candidate_profile_with_persistence(
        db,
        candidate_id=profile.id,
        candidate_payload=profile.payload,
        visa_type="O1",
    )

    return {
        "profile_id": profile.id,
        "candidate_name": profile.candidate_name,
        **result,
    }


app.include_router(analysis_router)