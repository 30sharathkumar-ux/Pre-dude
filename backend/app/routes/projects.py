from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError

from app.services.gemini_service import get_client, GEMINI_MODEL
from app.schemas.evaluation import EvaluationRequest, EvaluationResponse
from app.services.evaluation_service import evaluate_project

router = APIRouter()


# ---------------------------------------------------------------------------
# Connectivity test (no Gemini)
# ---------------------------------------------------------------------------

@router.get("/test")
async def projects_test():
    """
    Basic connectivity test — no AI involved.
    Confirms the FastAPI server is reachable from the frontend.
    """
    return {"message": "Project validation backend is ready"}


# ---------------------------------------------------------------------------
# Gemini connectivity test
# ---------------------------------------------------------------------------

class GeminiTestRequest(BaseModel):
    message: str


@router.post("/gemini-test")
async def gemini_test(body: GeminiTestRequest):
    """
    Sends a short message to Gemini and returns the response.
    Used to verify that the Gemini API key is configured and working.

    Security:
      - The API key is NEVER included in any response.
      - Errors are returned as safe, human-readable messages.
    """
    try:
        client = get_client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"Reply in one short sentence: {body.message}",
        )
        gemini_text = response.text
        return {
            "success": True,
            "response": gemini_text,
            "model": GEMINI_MODEL,
        }
    except RuntimeError as exc:
        # Key not configured — tell the user without leaking details.
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "error": str(exc),
            },
        )
    except Exception as exc:
        # Log the real error server-side for debugging.
        # Return only a safe summary to the caller — never the raw exception
        # which might contain internal details.
        print(f"[BuddyJudge] Gemini error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "success": False,
                "error": "Gemini request failed. Check the server logs for details.",
            },
        )


# ---------------------------------------------------------------------------
# BuddyJudge AI Evaluation
# ---------------------------------------------------------------------------

@router.post(
    "/evaluate",
    response_model=EvaluationResponse,
    summary="Evaluate a project using the BuddyJudge AI engine",
    description=(
        "Submit a hackathon or startup project for AI-powered evaluation. "
        "Returns structured scores, strengths, weaknesses, recommendations, "
        "judge questions, and findings — never free-form text."
    ),
)
async def evaluate(body: EvaluationRequest):
    """
    POST /api/projects/evaluate

    Sends the submitted project data to Gemini for critical evaluation.
    Uses Gemini's structured-output mode so the response is guaranteed
    JSON matching the EvaluationResponse schema.

    Security:
      - The API key is NEVER included in any response.
      - Internal stack traces are NEVER exposed.
    """
    try:
        result = await evaluate_project(body)
        return result

    except RuntimeError as exc:
        # API key not configured
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "error": str(exc),
            },
        )

    except ValueError as exc:
        # Gemini returned invalid / unparseable JSON
        print(f"[BuddyJudge] Evaluation validation error: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "success": False,
                "error": (
                    "The AI returned a response that could not be validated. "
                    "Please try again."
                ),
            },
        )

    except ValidationError as exc:
        # Pydantic validation failed on the AI response
        print(f"[BuddyJudge] Pydantic validation error: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "success": False,
                "error": (
                    "The AI response did not match the expected schema. "
                    "Please try again."
                ),
            },
        )

    except Exception as exc:
        # Catch-all: log the real error, return a safe message
        print(f"[BuddyJudge] Unexpected evaluation error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "success": False,
                "error": "Evaluation failed due to an unexpected error. Check server logs.",
            },
        )

