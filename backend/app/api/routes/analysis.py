from fastapi import APIRouter
from app.analysis.service import analyze_candidate_payload

router = APIRouter()

@router.post("/analyze")
def analyze(payload: dict):
    return analyze_candidate_payload(payload)