"""
schemas/evaluation.py

Pydantic models for the POST /api/projects/evaluate endpoint.

Covers both the inbound project-submission model and the structured
AI evaluation response that Gemini must return.

Rules:
  - No secrets, no API keys.
  - All scores are validated to their allowed ranges.
  - Enum values are strictly enforced.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ProjectType(str, Enum):
    hackathon = "hackathon"
    startup = "startup"


class FindingType(str, Enum):
    missing = "missing"
    risk = "risk"
    weakness = "weakness"
    strength = "strength"
    inconsistency = "inconsistency"
    recommendation = "recommendation"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------


class EvaluationRequest(BaseModel):
    """Inbound project submission for AI evaluation."""

    project_type: ProjectType = Field(
        ...,
        description="Type of project: 'hackathon' or 'startup'.",
    )
    project_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Name of the project.",
    )
    problem_statement: str = Field(
        ...,
        min_length=10,
        description="The problem this project aims to solve.",
    )
    solution_description: str = Field(
        ...,
        min_length=10,
        description="Description of the proposed solution.",
    )
    target_users: str = Field(
        ...,
        min_length=2,
        description="Who will use this product?",
    )
    technology_stack: str = Field(
        ...,
        min_length=2,
        description="Technologies used or planned.",
    )
    innovation: str = Field(
        ...,
        min_length=5,
        description="What makes this unique or innovative?",
    )
    implementation: str = Field(
        ...,
        min_length=5,
        description="How will the solution be implemented?",
    )
    impact: str = Field(
        ...,
        min_length=5,
        description="Expected impact of the project.",
    )

    # Optional fields
    business_model: Optional[str] = Field(
        default=None,
        description="Revenue model or sustainability plan.",
    )
    competitors: Optional[str] = Field(
        default=None,
        description="Known competitors or alternatives.",
    )
    additional_information: Optional[str] = Field(
        default=None,
        description="Any other relevant information.",
    )
    deployed_url: Optional[str] = Field(
        default=None,
        description="URL of the deployed/live website or prototype (http/https).",
    )
    github_url: Optional[str] = Field(
        default=None,
        description="URL of the public GitHub repository.",
    )

    @field_validator(
        "business_model", "competitors", "additional_information",
        "deployed_url", "github_url",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, v: Optional[str]) -> Optional[str]:
        """Treat blank strings the same as None so the AI can flag them."""
        if v is not None and v.strip() == "":
            return None
        return v


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class CriterionScore(BaseModel):
    """Score and explanation for a single evaluation criterion."""

    criterion: str = Field(..., description="Name of the evaluation criterion.")
    score: float = Field(..., ge=0.0, le=10.0, description="Score from 0 to 10.")
    explanation: str = Field(..., description="Detailed explanation of the score.")
    evidence: List[str] = Field(
        default_factory=list,
        description="Specific evidence points from the submission.",
    )


class Finding(BaseModel):
    """A specific finding identified by the AI judge."""

    finding_type: FindingType
    title: str = Field(..., description="Short title of the finding.")
    description: str = Field(..., description="Detailed description.")
    severity: Severity
    source: str = Field(..., description="Which field or section this finding relates to.")


class EvaluationResponse(BaseModel):
    """
    Structured AI evaluation result.

    Used as both the Gemini response_schema and the FastAPI response model.
    """

    judge_readiness_score: float = Field(
        ..., ge=0.0, le=100.0, description="Overall Judge Readiness Score from 0 to 100."
    )
    overall_summary: str = Field(..., description="High-level critical summary.")
    scores: List[CriterionScore] = Field(..., description="Per-criterion scores.")
    strengths: List[str] = Field(..., description="Key strengths identified.")
    weaknesses: List[str] = Field(..., description="Key weaknesses identified.")
    recommendations: List[str] = Field(..., description="Concrete recommendations.")
    judge_questions: List[str] = Field(..., description="Questions a judge would ask.")
    findings: List[Finding] = Field(..., description="Specific findings.")
