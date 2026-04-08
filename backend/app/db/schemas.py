from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr


class MetaSchema(BaseModel):
    version: str
    schema: str
    created_at: str | None = None
    updated_at: str | None = None
    source: str
    visa_type: str


class CandidateSchema(BaseModel):
    full_name: str
    email: EmailStr
    current_role: str
    current_company: str
    years_of_experience: int | float
    country_of_citizenship: str
    current_location: str
    linkedin_url: str | None = ""
    github_url: str | None = ""
    portfolio_url: str | None = ""


class EducationSchema(BaseModel):
    highest_degree: str
    field_of_study: str
    university: str
    graduation_year: int


class EmployerContextSchema(BaseModel):
    company_name: str
    company_stage: str
    offered_role: str
    offered_salary_usd: int | float
    remote_or_onsite: str
    h1b_wage_band: str


class AchievementsSchema(BaseModel):
    publications_count: int = 0
    patents_count: int = 0
    awards_count: int = 0
    recommendation_letters_count: int = 0
    speaking_engagements_count: int = 0
    media_mentions_count: int = 0
    open_source_projects_count: int = 0
    major_projects_count: int = 0
    scholarly_articles: str = ""
    notable_awards: str = ""
    press_links: str = ""
    patents_summary: str = ""
    project_impact_summary: str = ""


class EvidenceFlagsSchema(BaseModel):
    has_high_salary: bool = False
    has_leadership_role: bool = False
    has_judging_experience: bool = False
    has_critical_employment: bool = False
    has_membership_in_elite_associations: bool = False
    has_original_contributions: bool = False
    has_commercial_success: bool = False
    has_media_coverage: bool = False


class NarrativeSchema(BaseModel):
    candidate_summary: str = ""
    strongest_case_points: str = ""
    possible_risks_or_gaps: str = ""


class ConsentSchema(BaseModel):
    confirm_information_accuracy: bool


class AIInputSummarySchema(BaseModel):
    candidate_name: str
    visa_type: str
    current_role: str
    employer: str
    h1b_wage_band: str
    evidence_snapshot: Dict[str, Any]


class CandidateProfileCreate(BaseModel):
    meta: MetaSchema
    candidate: CandidateSchema
    education: EducationSchema
    employer_context: EmployerContextSchema
    achievements: AchievementsSchema
    evidence_flags: EvidenceFlagsSchema
    narrative: NarrativeSchema
    consent: ConsentSchema
    ai_input_summary: AIInputSummarySchema


class CandidateProfileResponse(BaseModel):
    id: int
    candidate_name: str
    candidate_email: str
    current_role: str | None = None
    visa_type: str
    employer_name: str | None = None
    h1b_wage_band: str | None = None
    payload: Dict[str, Any]

    class Config:
        from_attributes = True


class AnalysisRunResponse(BaseModel):
    id: int
    candidate_id: int
    parent_analysis_id: Optional[int] = None
    run_type: str
    visa_type: str
    generator_model: str
    prompt_version: str
    retrieval_context_json: List[Any]
    analysis_output_json: Dict[str, Any]
    selected_final: bool

    class Config:
        from_attributes = True


class EvaluationRunResponse(BaseModel):
    id: int
    analysis_run_id: int
    evaluator_model: str
    evaluation_prompt_version: str
    overall_score: float
    policy_alignment: float
    factual_grounding: float
    completeness: float
    structure_quality: float
    feedback_json: Dict[str, Any]

    class Config:
        from_attributes = True