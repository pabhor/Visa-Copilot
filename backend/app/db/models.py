from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Numeric,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String, nullable=False, index=True)
    candidate_email = Column(String, nullable=False, index=True)
    current_role = Column(String, nullable=True)
    visa_type = Column(String, nullable=False, index=True)
    employer_name = Column(String, nullable=True, index=True)
    h1b_wage_band = Column(String, nullable=True, index=True)
    payload = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    analysis_runs = relationship(
        "AnalysisRun",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )


class AnalysisRun(Base):
    __tablename__ = "analysis_run"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(
        Integer,
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_analysis_id = Column(
        Integer,
        ForeignKey("analysis_run.id", ondelete="SET NULL"),
        nullable=True,
    )
    run_type = Column(String(20), nullable=False, default="initial")
    visa_type = Column(String(20), nullable=False, default="O1")
    generator_model = Column(Text, nullable=False)
    prompt_version = Column(Text, nullable=False)
    retrieval_context_json = Column(JSONB, nullable=False, default=list)
    analysis_output_json = Column(JSONB, nullable=False)
    selected_final = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    candidate = relationship("CandidateProfile", back_populates="analysis_runs")
    evaluations = relationship(
        "EvaluationRun",
        back_populates="analysis_run",
        cascade="all, delete-orphan",
    )
    parent = relationship("AnalysisRun", remote_side=[id])


class EvaluationRun(Base):
    __tablename__ = "evaluation_run"

    id = Column(Integer, primary_key=True)
    analysis_run_id = Column(
        Integer,
        ForeignKey("analysis_run.id", ondelete="CASCADE"),
        nullable=False,
    )
    evaluator_model = Column(Text, nullable=False)
    evaluation_prompt_version = Column(Text, nullable=False)
    overall_score = Column(Numeric(5, 2), nullable=False, default=0)
    policy_alignment = Column(Numeric(5, 2), nullable=False, default=0)
    factual_grounding = Column(Numeric(5, 2), nullable=False, default=0)
    completeness = Column(Numeric(5, 2), nullable=False, default=0)
    structure_quality = Column(Numeric(5, 2), nullable=False, default=0)
    feedback_json = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="evaluations")


class PromptMemory(Base):
    __tablename__ = "prompt_memory"

    id = Column(Integer, primary_key=True)
    memory_scope = Column(String(30), nullable=False, default="global")
    source_type = Column(String(30), nullable=False)
    source_key = Column(Text, nullable=False)
    instruction_text = Column(Text, nullable=False)
    weight = Column(Numeric(6, 2), nullable=False, default=1.0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )