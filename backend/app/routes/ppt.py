"""
routes/ppt.py

Phase 6 — POST /api/ppt/analyze
=================================

Orchestrates the full PPT analysis pipeline:

  template_file (optional)
      ↓  extract_document()
      ↓  analyze_template()
      → TemplateAnalysis

  student_file (required)
      ↓  extract_document()
      → ExtractionResult

  (both available)  → match_requirements() → RequirementMatch[]

  evaluate_presentation(
      template_analysis | None,
      requirement_matches,
      student_extraction,
  )
  → PPTEvaluationResponse  (HTTP 200)

Security rules
--------------
- Uploaded files are NEVER executed or persisted.
- Files are validated by extraction_service.py (magic bytes, extension, size).
- No internal stack traces or API keys are returned in error responses.
- Full document text is NEVER logged.
- All file content treated as UNTRUSTED DATA.

Error codes used
---------------
400  File rejected by extraction_service (bad type / malformed / empty).
413  File exceeds 20 MB.
422  FastAPI form/type validation failure.
500  Unexpected internal error.
502  Gemini returned invalid / unparseable data.
503  Gemini API key not configured or model temporarily unavailable.

Context fields (accepted, not yet wired into evaluation engine)
---------------------------------------------------------------
presentation_type, problem_statement, judging_criteria, target_audience
These fields are forwarded to evaluate_presentation() via logging for now.
When the evaluation service is extended to accept them, this route needs
no changes — just pass them through.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.schemas.ppt import PPTEvaluationResponse
from app.services.extraction_service import ExtractionError, extract_document
from app.services.ppt_evaluation_service import evaluate_presentation
from app.services.requirement_matcher import match_requirements
from app.services.template_analyzer import analyze_template

logger = logging.getLogger(__name__)

router = APIRouter()

# Maximum accepted upload size (bytes). Extraction service enforces its own
# limit; we also check here so we can return 413 before reading the whole body.
_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _read_upload(upload: UploadFile, label: str) -> bytes:
    """
    Safely read an UploadFile into bytes.

    Raises:
        HTTPException 413  if the file exceeds 20 MB.
        HTTPException 400  if the file is empty.
    """
    data = await upload.read()
    if len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} is empty. Please upload a valid .pptx or .pdf file.",
        )
    if len(data) > _MAX_FILE_BYTES:
        mb = len(data) / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"{label} is too large ({mb:.1f} MB). "
                "Maximum allowed size is 20 MB."
            ),
        )
    return data


def _safe_filename(upload: UploadFile) -> str:
    """Return the upload filename, defaulting to 'upload' if absent."""
    return upload.filename or "upload"


# ---------------------------------------------------------------------------
# Connectivity test (keep for backwards compatibility)
# ---------------------------------------------------------------------------


@router.get(
    "/test",
    summary="PPT analyzer connectivity check",
    description="Confirms the PPT analyzer backend is reachable. No AI involved.",
)
async def ppt_test():
    """
    GET /api/ppt/test

    Returns a simple health message. Retained from Phase 1 for backwards
    compatibility with any existing health checks.
    """
    return {"message": "PPT analyzer backend is ready"}


# ---------------------------------------------------------------------------
# POST /api/ppt/analyze
# ---------------------------------------------------------------------------


@router.post(
    "/analyze",
    response_model=PPTEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze a student presentation",
    description=(
        "Analyze a student presentation (.pptx or .pdf) with optional reference "
        "template compliance checking.\n\n"
        "**With template only:** Evaluates the student PPT against 10 quality "
        "criteria without template compliance.\n\n"
        "**With student + template:** Performs full requirement matching and "
        "template compliance scoring before quality evaluation.\n\n"
        "**Context fields** (`presentation_type`, `problem_statement`, "
        "`judging_criteria`, `target_audience`) are accepted and logged but not "
        "yet wired into the evaluation engine. They will be used in a future update."
    ),
    tags=["PPT Analyzer"],
)
async def analyze_presentation(
    student_file: UploadFile = File(
        ...,
        description="Student's presentation (.pptx or .pdf, max 20 MB).",
    ),
    template_file: Optional[UploadFile] = File(
        default=None,
        description=(
            "Optional reference template (.pptx or .pdf, max 20 MB). "
            "When provided, template compliance scoring is enabled."
        ),
    ),
    presentation_type: Optional[str] = Form(
        default=None,
        description="Type of presentation (e.g. 'hackathon', 'startup').",
    ),
    problem_statement: Optional[str] = Form(
        default=None,
        description="Brief description of the problem being addressed.",
    ),
    judging_criteria: Optional[str] = Form(
        default=None,
        description="Custom judging criteria to consider during evaluation.",
    ),
    target_audience: Optional[str] = Form(
        default=None,
        description="Intended audience for the presentation.",
    ),
):
    """
    POST /api/ppt/analyze

    Full PPT analysis pipeline. Returns a PPTEvaluationResponse with scores,
    findings, slide analysis, strengths, weaknesses, and judge questions.

    Context fields are accepted but not yet used by the evaluation engine.
    They are logged at INFO level for observability.
    """
    # ------------------------------------------------------------------
    # 1. Read uploaded files (size + empty checks before extraction)
    # ------------------------------------------------------------------
    student_bytes = await _read_upload(student_file, "Student presentation")
    student_filename = _safe_filename(student_file)

    template_bytes: Optional[bytes] = None
    template_filename: Optional[str] = None

    if template_file is not None and template_file.filename:
        template_bytes = await _read_upload(template_file, "Reference template")
        template_filename = _safe_filename(template_file)

    # Log context fields at INFO level (no document text, no API keys)
    logger.info(
        "PPT analyze request: student=%s, template=%s, "
        "type=%s, audience=%s",
        student_filename,
        template_filename or "none",
        presentation_type or "unspecified",
        target_audience or "unspecified",
    )
    if problem_statement:
        logger.info("Context: problem_statement provided (%d chars)", len(problem_statement))
    if judging_criteria:
        logger.info("Context: judging_criteria provided (%d chars)", len(judging_criteria))

    # ------------------------------------------------------------------
    # 2. Extract student presentation
    # ------------------------------------------------------------------
    try:
        student_extraction = extract_document(student_bytes, student_filename)
    except ExtractionError as exc:
        logger.warning("Student extraction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Unexpected student extraction error: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An unexpected error occurred while reading the student presentation. "
                "Please try again."
            ),
        )

    # ------------------------------------------------------------------
    # 3. Optional: extract + analyze reference template
    # ------------------------------------------------------------------
    template_analysis = None
    requirement_matches = []

    if template_bytes is not None and template_filename is not None:
        # 3a. Extract template
        try:
            template_extraction = extract_document(template_bytes, template_filename)
        except ExtractionError as exc:
            logger.warning("Template extraction failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reference template could not be read: {exc}",
            )
        except Exception as exc:
            logger.error("Unexpected template extraction error: %s: %s", type(exc).__name__, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "An unexpected error occurred while reading the reference template. "
                    "Please try again."
                ),
            )

        # 3b. AI template analysis
        try:
            template_analysis = await analyze_template(
                template_extraction, template_filename
            )
        except RuntimeError as exc:
            # API key not configured
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "The AI evaluation service is not configured. "
                    "Please check the server API key settings."
                ),
            )
        except ValueError as exc:
            logger.warning("Template analysis returned invalid data: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "The AI could not extract requirements from the reference template. "
                    "Please ensure the template is a valid presentation file and try again."
                ),
            )
        except Exception as exc:
            err_str = str(exc)
            if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "The AI evaluation service is temporarily unavailable due to high demand. "
                        "Please try again in a few minutes."
                    ),
                )
            logger.error("Template analysis error: %s: %s", type(exc).__name__, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Template analysis failed due to an unexpected error.",
            )

        # 3c. Requirement matching
        try:
            requirement_matches = await match_requirements(
                template_analysis, student_extraction
            )
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "The AI evaluation service is not configured. "
                    "Please check the server API key settings."
                ),
            )
        except ValueError as exc:
            logger.warning("Requirement matching returned invalid data: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "The AI could not complete requirement matching. "
                    "Please try again."
                ),
            )
        except Exception as exc:
            err_str = str(exc)
            if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "The AI evaluation service is temporarily unavailable. "
                        "Please try again in a few minutes."
                    ),
                )
            logger.error("Requirement matching error: %s: %s", type(exc).__name__, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Requirement matching failed due to an unexpected error.",
            )

    # ------------------------------------------------------------------
    # 4. Final evaluation
    # ------------------------------------------------------------------
    try:
        result = await evaluate_presentation(
            template_analysis=template_analysis,
            requirement_matches=requirement_matches,
            presentation=student_extraction,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The AI evaluation service is not configured. "
                "Please check the server API key settings."
            ),
        )
    except ValueError as exc:
        logger.warning("Evaluation returned invalid data: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The AI returned a response that could not be validated. "
                "Please try again."
            ),
        )
    except ValidationError as exc:
        logger.warning("Pydantic validation failed on evaluation response: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The AI response did not match the expected schema. "
                "Please try again."
            ),
        )
    except Exception as exc:
        err_str = str(exc)
        if "503" in err_str or "UNAVAILABLE" in err_str:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "The AI evaluation service is temporarily unavailable due to high demand. "
                    "Please try again in a few minutes."
                ),
            )
        logger.error("Evaluation error: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Presentation evaluation failed due to an unexpected error.",
        )

    logger.info(
        "PPT analysis complete: overall=%.1f, compliance=%.0f/100, "
        "slides=%d, findings=%d",
        result.overall_score,
        result.template_compliance_score,
        len(result.slide_analysis),
        len(result.findings),
    )

    return result
