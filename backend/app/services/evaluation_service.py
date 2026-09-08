"""
services/evaluation_service.py

Builds the evaluation prompt for BuddyJudge and calls Gemini with
structured-output mode so the response is guaranteed JSON that
matches `EvaluationResponse`.

Before calling Gemini, the service optionally fetches live evidence from:
  - The project's deployed website (via url_analyzer)
  - The project's GitHub repository (via github_analyzer)

Both fetches run concurrently via asyncio.gather so latency is minimised.

Security rules:
  - Never logs or returns the API key.
  - Never exposes stack traces to callers.
  - All errors are wrapped into safe messages.
  - Live evidence is clearly labelled; absent evidence is never fabricated.
"""

from __future__ import annotations

import asyncio

from google.genai import types

from app.services.gemini_service import get_client, GEMINI_MODEL
from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    ProjectType,
)
from app.services.url_analyzer import analyze_website, format_website_evidence
from app.services.github_analyzer import analyze_github, format_github_evidence


# ---------------------------------------------------------------------------
# Criteria lists (kept here so the prompt builder stays DRY)
# ---------------------------------------------------------------------------

HACKATHON_CRITERIA: list[str] = [
    "Problem-Solution Fit",
    "Innovation",
    "Technical Feasibility",
    "Hackathon Alignment",
    "User Impact",
    "Differentiation",
    "Prototype/MVP Readiness",
    "Scalability",
    "Evidence/Validation",
    "Judge Readiness",
]

STARTUP_CRITERIA: list[str] = [
    "Problem Severity",
    "Solution Strength",
    "Market Potential",
    "Innovation",
    "Competitive Differentiation",
    "Technical Feasibility",
    "Business Model",
    "Scalability",
    "Validation/Evidence",
    "Startup Readiness",
]


# ---------------------------------------------------------------------------
# Evidence gathering
# ---------------------------------------------------------------------------

async def _gather_live_evidence(req: EvaluationRequest) -> str:
    """
    Concurrently fetch website and GitHub evidence (if URLs provided).
    Return a clearly-labelled evidence block string for inclusion in the prompt.
    """
    deployed_url = req.deployed_url
    github_url = req.github_url

    # Run both fetches concurrently; neither raises.
    website_task = (
        analyze_website(deployed_url) if deployed_url else None
    )
    github_task = (
        analyze_github(github_url) if github_url else None
    )

    if website_task is not None and github_task is not None:
        website_ev, github_ev = await asyncio.gather(website_task, github_task)
    elif website_task is not None:
        website_ev = await website_task
        github_ev = None
    elif github_task is not None:
        website_ev = None
        github_ev = await github_task
    else:
        website_ev = None
        github_ev = None

    # Format website section
    if website_ev is not None:
        website_block = format_website_evidence(website_ev)
    else:
        website_block = "  Status: [NOT PROVIDED] — No deployed URL was submitted."

    # Format GitHub section
    if github_ev is not None:
        github_block = format_github_evidence(github_ev)
    else:
        github_block = "  Status: [NOT PROVIDED] — No GitHub URL was submitted."

    evidence_block = (
        "=== LIVE EVIDENCE ===\n"
        "The following evidence was gathered automatically BEFORE this evaluation.\n"
        "Use this evidence when scoring: Technical Feasibility, Prototype/MVP Readiness,\n"
        "Scalability, Evidence/Validation, Differentiation, Innovation, Judge Readiness.\n"
        "Identify any inconsistencies between user claims, website evidence, and GitHub evidence.\n"
        "NEVER assume evidence exists if it is marked [NOT PROVIDED], [UNREACHABLE],\n"
        "[PRIVATE / NOT FOUND], or [ANALYSIS FAILED]. Do NOT fabricate evidence.\n"
        "\n"
        "WEBSITE EVIDENCE:\n"
        f"{website_block}\n"
        "\n"
        "GITHUB EVIDENCE:\n"
        f"{github_block}"
    )

    return evidence_block


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(req: EvaluationRequest, evidence_block: str) -> str:
    """Return the full evaluation prompt for Gemini."""

    is_hackathon = req.project_type == ProjectType.hackathon
    role = (
        "an experienced hackathon judge"
        if is_hackathon
        else "an experienced startup evaluator and venture analyst"
    )
    criteria = HACKATHON_CRITERIA if is_hackathon else STARTUP_CRITERIA
    criteria_block = "\n".join(f"  {i+1}. {c}" for i, c in enumerate(criteria))

    # Build the project-data block
    fields = [
        ("Project Name", req.project_name),
        ("Problem Statement", req.problem_statement),
        ("Solution Description", req.solution_description),
        ("Target Users", req.target_users),
        ("Technology Stack", req.technology_stack),
        ("Innovation", req.innovation),
        ("Implementation Plan", req.implementation),
        ("Expected Impact", req.impact),
    ]
    if req.business_model is not None:
        fields.append(("Business Model", req.business_model))
    else:
        fields.append(("Business Model", "[NOT PROVIDED]"))
    if req.competitors is not None:
        fields.append(("Competitors / Alternatives", req.competitors))
    else:
        fields.append(("Competitors / Alternatives", "[NOT PROVIDED]"))
    if req.additional_information is not None:
        fields.append(("Additional Information", req.additional_information))

    project_block = "\n".join(f"  {label}: {value}" for label, value in fields)

    prompt = f"""You are {role}. You are evaluating a {"hackathon" if is_hackathon else "startup"} project submission.

=== EVALUATION RULES ===
- Be critical and honest. Do NOT blindly praise the project.
- Identify strengths AND weaknesses with equal rigor.
- Flag missing evidence, unrealistic claims, technical risks, differentiation problems, scalability concerns, market problems, and unclear assumptions.
- Do NOT claim the project will definitely win, get selected, or succeed.
- Use the term "Judge Readiness Score" to indicate how prepared the project is for judging. This is NOT a "Probability of Selection" or "Chance of Winning".
- The Judge Readiness Score (0–100) should reflect the overall quality, completeness, and presentation-readiness of the submission across all criteria.
- If competitor information is not provided, flag it as a finding with finding_type "missing" and severity "high".
- If business model is not provided for a startup project, flag it as a finding.
- Use the LIVE EVIDENCE section below to verify user claims. If evidence contradicts claims, flag it as an inconsistency finding.
- If a URL was provided but is marked [UNREACHABLE] or [ANALYSIS FAILED], flag this as a risk or weakness.
- NEVER fabricate or assume evidence that is not shown in the LIVE EVIDENCE section.

{evidence_block}

=== PROJECT DATA ===
  Project Type: {req.project_type.value}
{project_block}

=== EVALUATION CRITERIA ===
Evaluate the project on each of the following criteria. Score each from 0 to 10.
{criteria_block}

=== SCORING GUIDELINES ===
- 0–2: Fundamentally flawed or entirely missing
- 3–4: Weak, major gaps
- 5–6: Average, some strengths but notable weaknesses
- 7–8: Good, solid with minor issues
- 9–10: Excellent, outstanding with strong evidence

=== RESPONSE INSTRUCTIONS ===
- Provide the judge_readiness_score as a float between 0 and 100.
- Provide exactly 10 criterion scores matching the criteria listed above, in order.
- List at least 2 strengths and at least 2 weaknesses.
- List at least 2 concrete, actionable recommendations.
- List at least 2 tough questions a judge would ask.
- Report all findings: missing information, risks, weaknesses, strengths, inconsistencies, and recommendations.
- For each finding, specify finding_type (missing | risk | weakness | strength | inconsistency | recommendation), a short title, a detailed description, severity (low | medium | high | critical), and the source field it relates to.
- Be specific and cite evidence from the submission and the LIVE EVIDENCE wherever possible.
- Do NOT add any text outside the JSON structure.
"""
    return prompt


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def evaluate_project(req: EvaluationRequest) -> EvaluationResponse:
    """
    Gather live evidence, build the evaluation prompt, send to Gemini,
    and return a validated ``EvaluationResponse``.

    Raises
    ------
    RuntimeError
        If the API key is missing.
    ValueError
        If Gemini returns JSON that fails Pydantic validation.
    Exception
        For any other Gemini / network error.
    """
    client = get_client()

    # Gather live evidence concurrently (never raises)
    evidence_block = await _gather_live_evidence(req)

    prompt = _build_prompt(req, evidence_block)

    # Use Gemini's structured-output mode: the SDK sends the Pydantic
    # schema to the model and returns `response.parsed` as an instance
    # of the schema.
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EvaluationResponse,
            temperature=0.4,           # favour consistency over creativity
        ),
    )

    # response.parsed is the Pydantic model instance when using
    # response_schema. If structured output fails for any reason,
    # fall back to manual parsing.
    if response.parsed is not None:
        return response.parsed  # type: ignore[return-value]

    # Fallback: try to parse the raw text manually
    raw_text = response.text
    if not raw_text:
        raise ValueError(
            "Gemini returned an empty response. "
            "The model may be overloaded — please try again."
        )

    try:
        return EvaluationResponse.model_validate_json(raw_text)
    except Exception as parse_err:
        raise ValueError(
            f"Gemini returned invalid JSON that could not be validated: {parse_err}"
        ) from parse_err
