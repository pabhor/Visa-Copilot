from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
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