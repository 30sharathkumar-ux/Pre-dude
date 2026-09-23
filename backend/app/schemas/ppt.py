from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

# Reuse existing enums from the project evaluation schema
from app.schemas.evaluation import FindingType, Severity


class RequirementType(str, Enum):
    required = "required"
    recommended = "recommended"
    optional = "optional"


class MatchStatus(str, Enum):
    matched = "matched"
    partially_matched = "partially_matched"
    missing = "missing"
    not_applicable = "not_applicable"


class TemplateRequirement(BaseModel):
    requirement_id: str = Field(..., description="Unique ID for the requirement")
    title: str = Field(..., description="Title of the requirement")
    description: str = Field(..., description="Detailed description")
    requirement_type: RequirementType
    expected_slide: Optional[int] = Field(default=None, description="Slide number where this is expected")
    keywords: List[str] = Field(default_factory=list)
    source: str = Field(..., description="Where this requirement comes from")


class TemplateAnalysis(BaseModel):
    template_name: str
    total_slides: int
    requirements: List[TemplateRequirement] = Field(default_factory=list)
    overall_structure: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


class SlideAnalysis(BaseModel):
    slide_number: int
    title: str
    summary: str
    content_present: bool
    visual_elements_detected: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


class RequirementMatch(BaseModel):
    requirement_id: str
    requirement_title: str
    status: MatchStatus
    matching_slides: List[int] = Field(default_factory=list)
    explanation: str
    recommendations: List[str] = Field(default_factory=list)


class PPTCriterionScore(BaseModel):
    criterion: str
    score: float = Field(..., ge=0.0, le=10.0)
    explanation: str
    evidence: List[str] = Field(default_factory=list)


class PPTFinding(BaseModel):
    finding_type: FindingType
    title: str
    description: str
    severity: Severity
    source: str


class PPTEvaluationResponse(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0)
    overall_summary: str
    template_compliance_score: float = Field(..., ge=0.0, le=100.0)
    
    scores: List[PPTCriterionScore] = Field(default_factory=list)
    template_requirements: List[TemplateRequirement] = Field(default_factory=list)
    requirement_matches: List[RequirementMatch] = Field(default_factory=list)
    slide_analysis: List[SlideAnalysis] = Field(default_factory=list)
    
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    judge_questions: List[str] = Field(default_factory=list)
    findings: List[PPTFinding] = Field(default_factory=list)
