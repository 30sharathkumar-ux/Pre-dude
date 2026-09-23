"""
tests/test_ppt_route.py

Phase 6 - Tests for POST /api/ppt/analyze

Test strategy
-------------
Unit tests (1-14): All services are MOCKED — deterministic, no API key needed.
The FastAPI TestClient is used so route-level logic (file reading, error
mapping, response serialization) is exercised without calling Gemini.

Integration test (15): Real multipart HTTP call using NIRMAAN_template.pdf
and synthetic student PPTX. Skipped if API key is absent or Gemini returns 503.

Regression tests (16+): Existing routes and imports still work.

Tests
-----
 1. Student PPT only -> evaluate called with template=None
 2. Student PPT + template -> full pipeline called
 3. PDF student presentation
 4. Unsupported .docx -> 400
 5. Oversized student file -> 413
 6. Oversized template file -> 413
 7. Empty student file -> 400
 8. Empty template file -> 400
 9. Template analysis failure -> 502/503
10. Requirement matching failure -> 502/503
11. Evaluation failure -> 502/503
12. Successful PPTEvaluationResponse returned
13. GET /api/ppt/test still works
14. GET /api/projects/evaluate exists (via router check)
15. Real end-to-end: NIRMAAN + synthetic student PPTX
16. app.main imports successfully
"""

from __future__ import annotations

import io
import os
import sys
import unittest.mock as mock
from typing import Optional

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.ppt import (
    MatchStatus,
    PPTCriterionScore,
    PPTEvaluationResponse,
    RequirementMatch,
    RequirementType,
    SlideAnalysis,
    TemplateAnalysis,
    TemplateRequirement,
)
from app.services.extraction_service import (
    ExtractionResult,
    FileType,
    PresentationMetadata,
    SlideExtraction,
    TextBlock,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_BASE_DIR = os.path.dirname(__file__)


def _make_pptx_bytes(n_slides: int = 3) -> bytes:
    """Build a minimal in-memory PPTX with n slides."""
    from pptx import Presentation
    prs = Presentation()
    layout = prs.slide_layouts[1]
    titles = ["Introduction", "Problem", "Solution", "Architecture", "Team"]
    bodies = [
        "Project overview",
        "Water quality problem affecting 2B people",
        "IoT sensor + AI solution",
        "React frontend, FastAPI backend, Supabase database",
        "Team: Riya (lead), Aarav, Meera",
    ]
    for i in range(n_slides):
        s = prs.slides.add_slide(layout)
        if s.shapes.title:
            s.shapes.title.text = titles[i % len(titles)]
        try:
            s.placeholders[1].text = bodies[i % len(bodies)]
        except Exception:
            pass
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def _make_pdf_bytes() -> bytes:
    """Build a minimal PDF-like payload (real PDF header for magic byte validation)."""
    # Use reportlab if available; otherwise use a real PDF from tests directory
    try:
        import reportlab.lib.pagesizes as ps
        from reportlab.pdfgen import canvas as rl_canvas
        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=ps.A4)
        c.drawString(72, 750, "Student Project: AquaSense")
        c.drawString(72, 730, "Problem: Water quality monitoring")
        c.showPage()
        c.save()
        return buf.getvalue()
    except ImportError:
        pass
    # Fallback: read the NIRMAAN PDF (it IS a PDF and passes magic byte check)
    nirmaan = os.path.join(_BASE_DIR, "NIRMAAN_template.pdf")
    if os.path.exists(nirmaan):
        with open(nirmaan, "rb") as f:
            return f.read()
    # Last resort: minimal valid PDF
    return (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f\n"
        b"0000000009 00000 n\n0000000058 00000 n\n"
        b"0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
    )


def _mock_extraction(filename: str, n_slides: int = 3) -> ExtractionResult:
    ftype = FileType.pdf if filename.endswith(".pdf") else FileType.pptx
    slides = [
        SlideExtraction(
            slide_number=i + 1,
            title=f"Slide {i + 1}",
            text=f"Content of slide {i + 1}",
            text_blocks=[TextBlock(shape_type="BODY", text=f"Body text {i + 1}")],
            image_count=0,
            shape_count=2,
            text_character_count=20,
        )
        for i in range(n_slides)
    ]
    return ExtractionResult(
        metadata=PresentationMetadata(file_type=ftype, total_slides=n_slides),
        slides=slides,
    )


def _mock_template_analysis() -> TemplateAnalysis:
    return TemplateAnalysis(
        template_name="Test Hackathon Template",
        total_slides=7,
        requirements=[
            TemplateRequirement(
                requirement_id="REQ-001",
                title="Problem Statement",
                description="Clear problem definition",
                requirement_type=RequirementType.required,
                keywords=["problem"],
                source="Slide 1",
            ),
            TemplateRequirement(
                requirement_id="REQ-002",
                title="Solution",
                description="Proposed solution",
                requirement_type=RequirementType.required,
                keywords=["solution"],
                source="Slide 2",
            ),
        ],
        overall_structure=["Slide 1: Problem", "Slide 2: Solution"],
        notes=[],
    )


def _mock_requirement_matches() -> list[RequirementMatch]:
    return [
        RequirementMatch(
            requirement_id="REQ-001",
            requirement_title="Problem Statement",
            status=MatchStatus.matched,
            matching_slides=[1],
            explanation="Clear problem on slide 1",
            recommendations=[],
        ),
        RequirementMatch(
            requirement_id="REQ-002",
            requirement_title="Solution",
            status=MatchStatus.partially_matched,
            matching_slides=[2],
            explanation="Partial solution coverage",
            recommendations=["Add more detail"],
        ),
    ]


def _mock_evaluation_response() -> PPTEvaluationResponse:
    criteria = [
        "Template Compliance", "Problem Clarity", "Solution Clarity", "Innovation",
        "Technical Depth", "Architecture / Implementation", "Market / User Relevance",
        "Evidence / Validation", "Presentation Structure", "Visual Communication",
    ]
    return PPTEvaluationResponse(
        overall_score=72.5,
        overall_summary="A solid presentation with clear problem definition.",
        template_compliance_score=75.0,
        scores=[
            PPTCriterionScore(criterion=c, score=7.0, explanation=f"Good {c}", evidence=[])
            for c in criteria
        ],
        template_requirements=[],
        requirement_matches=[],
        slide_analysis=[
            SlideAnalysis(
                slide_number=i + 1,
                title=f"Slide {i + 1}",
                summary=f"Summary {i + 1}",
                content_present=True,
                visual_elements_detected=[],
                strengths=["Clear"],
                weaknesses=[],
            )
            for i in range(3)
        ],
        strengths=["Clear problem definition", "Technology stack documented"],
        weaknesses=["Architecture lacks detail"],
        recommendations=["Add validation data"],
        judge_questions=["How was this validated?"],
        findings=[],
    )


# ---------------------------------------------------------------------------
# Helper to apply full service mocks
# ---------------------------------------------------------------------------

def _apply_service_mocks(
    mocker_context,
    extract_side_effect=None,
    template_analysis_result=None,
    match_result=None,
    eval_result=None,
):
    """Return a context manager that patches all three service layers."""
    patches = {
        "app.routes.ppt.extract_document": extract_side_effect or (
            lambda b, fn: _mock_extraction(fn)
        ),
        "app.routes.ppt.analyze_template": mock.AsyncMock(
            return_value=template_analysis_result or _mock_template_analysis()
        ),
        "app.routes.ppt.match_requirements": mock.AsyncMock(
            return_value=match_result or _mock_requirement_matches()
        ),
        "app.routes.ppt.evaluate_presentation": mock.AsyncMock(
            return_value=eval_result or _mock_evaluation_response()
        ),
    }
    return patches


# ---------------------------------------------------------------------------
# Test 1: Student PPT only -> evaluate called without template
# ---------------------------------------------------------------------------

def test_student_only_no_template():
    pptx = _make_pptx_bytes(3)
    eval_result = _mock_evaluation_response()
    eval_result.template_compliance_score = 0.0

    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("test.pptx")) as mock_extract,
        mock.patch("app.routes.ppt.analyze_template") as mock_analyze,
        mock.patch("app.routes.ppt.match_requirements") as mock_match,
        mock.patch("app.routes.ppt.evaluate_presentation", new=mock.AsyncMock(return_value=eval_result)) as mock_eval,
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={"student_file": ("test.pptx", pptx, "application/octet-stream")},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "overall_score" in data
    assert "slide_analysis" in data
    # template services must NOT have been called
    mock_analyze.assert_not_called()
    mock_match.assert_not_called()
    # evaluate called with template_analysis=None
    call_kwargs = mock_eval.call_args.kwargs
    assert call_kwargs["template_analysis"] is None
    assert call_kwargs["requirement_matches"] == []


# ---------------------------------------------------------------------------
# Test 2: Student + template -> full pipeline called
# ---------------------------------------------------------------------------

def test_student_with_template_full_pipeline():
    pptx = _make_pptx_bytes(3)
    tmpl_bytes = _make_pptx_bytes(2)

    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("file.pptx")) as mock_extract,
        mock.patch("app.routes.ppt.analyze_template", new=mock.AsyncMock(return_value=_mock_template_analysis())) as mock_analyze,
        mock.patch("app.routes.ppt.match_requirements", new=mock.AsyncMock(return_value=_mock_requirement_matches())) as mock_match,
        mock.patch("app.routes.ppt.evaluate_presentation", new=mock.AsyncMock(return_value=_mock_evaluation_response())) as mock_eval,
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={
                "student_file": ("student.pptx", pptx, "application/octet-stream"),
                "template_file": ("template.pptx", tmpl_bytes, "application/octet-stream"),
            },
        )

    assert resp.status_code == 200, resp.text
    # All pipeline steps called
    assert mock_extract.call_count == 2  # once for each file
    mock_analyze.assert_called_once()
    mock_match.assert_called_once()
    mock_eval.assert_called_once()
    # evaluate called with template_analysis set
    call_kwargs = mock_eval.call_args.kwargs
    assert call_kwargs["template_analysis"] is not None
    assert len(call_kwargs["requirement_matches"]) == 2


# ---------------------------------------------------------------------------
# Test 3: PDF student presentation -> 200
# ---------------------------------------------------------------------------

def test_pdf_student_presentation():
    pdf = _make_pdf_bytes()
    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("report.pdf")),
        mock.patch("app.routes.ppt.evaluate_presentation", new=mock.AsyncMock(return_value=_mock_evaluation_response())),
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={"student_file": ("report.pdf", pdf, "application/pdf")},
        )
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------------------
# Test 4: Unsupported .docx -> 400
# ---------------------------------------------------------------------------

def test_unsupported_docx():
    from app.services.extraction_service import ExtractionError
    with mock.patch(
        "app.routes.ppt.extract_document",
        side_effect=ExtractionError("Unsupported file type: .docx"),
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={"student_file": ("report.docx", b"PK\x03\x04fake", "application/octet-stream")},
        )
    assert resp.status_code == 400
    assert "Unsupported" in resp.json()["detail"] or "docx" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 5: Oversized student file -> 413
# ---------------------------------------------------------------------------

def test_oversized_student_file():
    big = b"A" * (20 * 1024 * 1024 + 1)
    resp = client.post(
        "/api/ppt/analyze",
        files={"student_file": ("big.pptx", big, "application/octet-stream")},
    )
    assert resp.status_code == 413
    assert "too large" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 6: Oversized template file -> 413
# ---------------------------------------------------------------------------

def test_oversized_template_file():
    pptx = _make_pptx_bytes(2)
    big = b"A" * (20 * 1024 * 1024 + 1)
    with mock.patch(
        "app.routes.ppt.extract_document", return_value=_mock_extraction("student.pptx")
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={
                "student_file": ("student.pptx", pptx, "application/octet-stream"),
                "template_file": ("big_template.pptx", big, "application/octet-stream"),
            },
        )
    assert resp.status_code == 413
    assert "too large" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 7: Empty student file -> 400
# ---------------------------------------------------------------------------

def test_empty_student_file():
    resp = client.post(
        "/api/ppt/analyze",
        files={"student_file": ("empty.pptx", b"", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 8: Empty template file -> 400
# ---------------------------------------------------------------------------

def test_empty_template_file():
    pptx = _make_pptx_bytes(2)
    with mock.patch(
        "app.routes.ppt.extract_document", return_value=_mock_extraction("student.pptx")
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={
                "student_file": ("student.pptx", pptx, "application/octet-stream"),
                "template_file": ("empty.pptx", b"", "application/octet-stream"),
            },
        )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 9: Template analysis failure -> 502/503
# ---------------------------------------------------------------------------

def test_template_analysis_failure():
    pptx = _make_pptx_bytes(2)
    tmpl = _make_pptx_bytes(2)

    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("f.pptx")),
        mock.patch(
            "app.routes.ppt.analyze_template",
            new=mock.AsyncMock(side_effect=ValueError("Gemini invalid JSON")),
        ),
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={
                "student_file": ("student.pptx", pptx, "application/octet-stream"),
                "template_file": ("template.pptx", tmpl, "application/octet-stream"),
            },
        )
    assert resp.status_code == 502
    detail = resp.json()["detail"]
    # No raw exception details leaked
    assert "Gemini" not in detail or "invalid" not in detail.lower()
    assert "template" in detail.lower() or "AI" in detail


# ---------------------------------------------------------------------------
# Test 10: Requirement matching failure -> 502/503
# ---------------------------------------------------------------------------

def test_requirement_matching_failure():
    pptx = _make_pptx_bytes(2)
    tmpl = _make_pptx_bytes(2)

    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("f.pptx")),
        mock.patch("app.routes.ppt.analyze_template", new=mock.AsyncMock(return_value=_mock_template_analysis())),
        mock.patch(
            "app.routes.ppt.match_requirements",
            new=mock.AsyncMock(side_effect=ValueError("Gemini invalid matching JSON")),
        ),
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={
                "student_file": ("student.pptx", pptx, "application/octet-stream"),
                "template_file": ("template.pptx", tmpl, "application/octet-stream"),
            },
        )
    assert resp.status_code == 502
    assert "matching" in resp.json()["detail"].lower() or "AI" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 11: Evaluation failure -> 502/503
# ---------------------------------------------------------------------------

def test_evaluation_failure():
    pptx = _make_pptx_bytes(2)

    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("f.pptx")),
        mock.patch(
            "app.routes.ppt.evaluate_presentation",
            new=mock.AsyncMock(side_effect=ValueError("AI returned empty")),
        ),
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={"student_file": ("student.pptx", pptx, "application/octet-stream")},
        )
    assert resp.status_code == 502


# ---------------------------------------------------------------------------
# Test 12: Successful PPTEvaluationResponse returned with all required fields
# ---------------------------------------------------------------------------

def test_successful_response_shape():
    pptx = _make_pptx_bytes(3)
    eval_resp = _mock_evaluation_response()

    with (
        mock.patch("app.routes.ppt.extract_document", return_value=_mock_extraction("test.pptx")),
        mock.patch("app.routes.ppt.evaluate_presentation", new=mock.AsyncMock(return_value=eval_resp)),
    ):
        resp = client.post(
            "/api/ppt/analyze",
            files={"student_file": ("test.pptx", pptx, "application/octet-stream")},
        )

    assert resp.status_code == 200
    data = resp.json()

    required_fields = [
        "overall_score", "overall_summary", "template_compliance_score",
        "scores", "template_requirements", "requirement_matches",
        "slide_analysis", "strengths", "weaknesses",
        "recommendations", "judge_questions", "findings",
    ]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    assert 0.0 <= data["overall_score"] <= 100.0
    assert 0.0 <= data["template_compliance_score"] <= 100.0
    assert len(data["scores"]) == 10
    assert len(data["slide_analysis"]) == 3


# ---------------------------------------------------------------------------
# Test 13: GET /api/ppt/test still works
# ---------------------------------------------------------------------------

def test_get_ppt_test():
    resp = client.get("/api/ppt/test")
    assert resp.status_code == 200
    assert "message" in resp.json()
    assert "ready" in resp.json()["message"].lower()


# ---------------------------------------------------------------------------
# Test 14: /api/projects/evaluate route still exists
# ---------------------------------------------------------------------------

def test_projects_evaluate_route_exists():
    routes = {r.path for r in app.routes}
    assert "/api/projects/evaluate" in routes, \
        f"Project Validation route missing: {routes}"
    assert "/api/ppt/analyze" in routes, \
        f"PPT analyze route missing: {routes}"


# ---------------------------------------------------------------------------
# Test 15: Real end-to-end via HTTP — NIRMAAN + synthetic student PPTX
# ---------------------------------------------------------------------------

def _make_synthetic_pptx_bytes() -> bytes:
    from pptx import Presentation
    prs = Presentation()
    layout = prs.slide_layouts[1]
    slides_data = [
        {"title": "AquaSense - Smart Water Quality Monitor",
         "body": "Team: AquaSense | Leader: Riya Sharma | NIRMAAN 2026"},
        {"title": "Problem Statement",
         "body": "2B+ people lack safe water. Manual testing is slow and expensive."},
        {"title": "Proposed Solution",
         "body": "IoT sensor array + edge AI + cloud dashboard. 80% latency reduction."},
        {"title": "Architecture",
         "body": "Sensors connected to cloud."},  # intentionally weak
        {"title": "Team Details",
         "body": "Riya (21CS101), Aarav (21EC202). MIT/Apache licensed libraries."},
    ]
    for sd in slides_data:
        s = prs.slides.add_slide(layout)
        if s.shapes.title:
            s.shapes.title.text = sd["title"]
        try:
            s.placeholders[1].text = sd["body"]
        except Exception:
            pass
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


@pytest.mark.skipif(
    not os.path.exists(os.path.join(_BASE_DIR, "NIRMAAN_template.pdf")),
    reason="NIRMAAN_template.pdf not available",
)
def test_real_end_to_end_nirmaan():
    """
    Real HTTP call to POST /api/ppt/analyze with NIRMAAN template.
    Requires GEMINI_API_KEY to be configured. Skipped automatically if not.
    """
    from app.services.gemini_service import get_client
    try:
        get_client()
    except RuntimeError:
        pytest.skip("GEMINI_API_KEY not configured")

    nirmaan_path = os.path.join(_BASE_DIR, "NIRMAAN_template.pdf")
    with open(nirmaan_path, "rb") as f:
        template_bytes = f.read()

    student_bytes = _make_synthetic_pptx_bytes()

    resp = client.post(
        "/api/ppt/analyze",
        files={
            "student_file": ("student.pptx", student_bytes, "application/octet-stream"),
            "template_file": ("NIRMAAN_template.pdf", template_bytes, "application/pdf"),
        },
        data={
            "presentation_type": "hackathon",
            "problem_statement": "Water quality monitoring",
            "judging_criteria": "Innovation, Technical Depth, Demo Readiness",
            "target_audience": "Hackathon judges",
        },
        timeout=180,
    )

    # If Gemini is overloaded or quota-exhausted, accept 503 as infrastructure limitation
    if resp.status_code == 503:
        pytest.skip(f"Gemini temporarily unavailable/quota exceeded (503): {resp.json()}")

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    # All required fields
    required_fields = [
        "overall_score", "overall_summary", "template_compliance_score",
        "scores", "template_requirements", "requirement_matches",
        "slide_analysis", "strengths", "weaknesses",
        "recommendations", "judge_questions", "findings",
    ]
    for field in required_fields:
        assert field in data, f"Missing response field: {field}"

    assert 0.0 <= data["overall_score"] <= 100.0
    assert 0.0 <= data["template_compliance_score"] <= 100.0
    assert len(data["scores"]) == 10
    assert len(data["slide_analysis"]) == 5  # 5 slides in synthetic PPT

    # Requirement match expectations (not hardcoded — just verify shape)
    matches = data["requirement_matches"]
    assert len(matches) > 0
    match_statuses = {m["requirement_id"]: m["status"] for m in matches}

    # Expected patterns based on intentional gaps
    missing_reqs = [rid for rid, s in match_statuses.items() if s == "missing"]
    assert len(missing_reqs) >= 1, \
        f"Expected at least 1 missing requirement, got: {match_statuses}"

    print(f"\n  E2E RESULTS:")
    print(f"    Overall score:       {data['overall_score']:.1f}/100")
    print(f"    Template compliance: {data['template_compliance_score']:.0f}/100")
    print(f"    Slides analyzed:     {len(data['slide_analysis'])}")
    print(f"    Findings:            {len(data['findings'])}")
    print(f"    Match statuses: {match_statuses}")


# ---------------------------------------------------------------------------
# Test 16: app.main imports successfully
# ---------------------------------------------------------------------------

def test_app_main_import():
    import app.main as m
    assert hasattr(m, "app")


# ---------------------------------------------------------------------------
# Pytest entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Run via pytest when called directly
    import subprocess
    sys.exit(subprocess.call(["python", "-m", "pytest", __file__, "-v"]))
