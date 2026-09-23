"""
tests/test_extraction_service.py

Phase 2 - Unit tests for the document extraction service.

Tests:
  1. Valid PPTX extraction (programmatically generated)
  2. Valid PDF extraction (programmatically generated)
  3. Empty file rejection
  4. Unsupported file type rejection
  5. Oversized file rejection
  6. Path-traversal safe filename handling
  7. Bad magic bytes rejection
"""

from __future__ import annotations

import io
import sys
import os
import traceback

# Make sure the backend app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.extraction_service import (
    ExtractionError,
    ExtractionResult,
    FileType,
    MAX_FILE_SIZE_BYTES,
    extract_document,
    validate_upload,
)

# ---------------------------------------------------------------------------
# Helpers to build minimal valid test files in-memory
# ---------------------------------------------------------------------------


def _make_pptx_bytes(slides_data: list[dict]) -> bytes:
    """
    Build a minimal PPTX in memory using python-pptx.
    slides_data: list of {title, body} dicts.
    """
    from pptx import Presentation
    from pptx.util import Inches, Pt

    prs = Presentation()
    slide_layout = prs.slide_layouts[1]  # Title and Content layout

    for sd in slides_data:
        slide = prs.slides.add_slide(slide_layout)
        # Title
        title_ph = slide.shapes.title
        if title_ph:
            title_ph.text = sd.get("title", "")
        # Body
        body_ph = slide.placeholders[1]
        if body_ph:
            body_ph.text = sd.get("body", "")

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def _make_pdf_bytes(pages_data: list[dict]) -> bytes:
    """
    Build a minimal PDF in memory using PyMuPDF.
    pages_data: list of {text} dicts.
    """
    import fitz

    doc = fitz.open()
    for pd in pages_data:
        page = doc.new_page()
        page.insert_text((72, 100), pd.get("text", ""))
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Test runner helpers
# ---------------------------------------------------------------------------

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
results = []


def run_test(name: str, fn):
    try:
        fn()
        print(f"  [{PASS}] {name}")
        results.append((name, True, None))
    except AssertionError as e:
        print(f"  [{FAIL}] {name}: {e}")
        results.append((name, False, str(e)))
    except Exception as e:
        tb = traceback.format_exc()
        print(f"  [{FAIL}] {name}: {type(e).__name__}: {e}")
        print(f"         {tb}")
        results.append((name, False, f"{type(e).__name__}: {e}"))


# ---------------------------------------------------------------------------
# Test 1: Valid PPTX
# ---------------------------------------------------------------------------


def test_valid_pptx():
    slides_data = [
        {"title": "Introduction", "body": "Welcome to BuddyJudge. This is the intro slide."},
        {"title": "Problem Statement", "body": "Students submit PPTs for hackathons without structured feedback."},
        {"title": "Solution", "body": "BuddyJudge uses AI to evaluate presentations against a reference template."},
        {"title": "Architecture", "body": "FastAPI + Gemini + python-pptx + PyMuPDF"},
        {"title": "Team", "body": "Sharath Kumar and collaborators."},
    ]
    pptx_bytes = _make_pptx_bytes(slides_data)

    result: ExtractionResult = extract_document(pptx_bytes, "test_presentation.pptx")

    assert result.metadata.file_type == FileType.pptx, "Expected file_type=pptx"
    assert result.metadata.total_slides == 5, f"Expected 5 slides, got {result.metadata.total_slides}"
    assert len(result.slides) == 5, f"Expected 5 slide objects, got {len(result.slides)}"

    # Ordering
    for i, slide in enumerate(result.slides, start=1):
        assert slide.slide_number == i, f"Slide {i} has wrong slide_number={slide.slide_number}"

    # Title detection
    assert result.slides[0].title == "Introduction", \
        f"Slide 1 title: '{result.slides[0].title}'"
    assert result.slides[1].title == "Problem Statement", \
        f"Slide 2 title: '{result.slides[1].title}'"

    # Text extraction
    for slide in result.slides:
        assert slide.text_character_count > 0, f"Slide {slide.slide_number} has no text"
        assert len(slide.text_blocks) > 0, f"Slide {slide.slide_number} has no text blocks"

    # Layout info present
    assert result.slides[0].layout_information is not None, "Layout info missing"
    assert result.slides[0].layout_information.shape_positions, "No shape positions"

    print(f"       Extracted {result.metadata.total_slides} slides, "
          f"total chars: {sum(s.text_character_count for s in result.slides)}")


# ---------------------------------------------------------------------------
# Test 2: Valid PDF
# ---------------------------------------------------------------------------


def test_valid_pdf():
    pages_data = [
        {"text": "NIRMAAN Hackathon 2026\nProblem Statement Overview\nThis document outlines the challenge."},
        {"text": "Solution Architecture\nWe propose a multi-layer AI evaluation system."},
        {"text": "Team & Timeline\nTeam: BuddyJudge\nTimeline: 3 months"},
    ]
    pdf_bytes = _make_pdf_bytes(pages_data)

    result: ExtractionResult = extract_document(pdf_bytes, "test_document.pdf")

    assert result.metadata.file_type == FileType.pdf, "Expected file_type=pdf"
    assert result.metadata.total_slides == 3, f"Expected 3 pages, got {result.metadata.total_slides}"
    assert len(result.slides) == 3, f"Expected 3 slide objects, got {len(result.slides)}"

    # Ordering
    for i, page in enumerate(result.slides, start=1):
        assert page.slide_number == i, f"Page {i} has wrong slide_number={page.slide_number}"

    # Text extraction
    for page in result.slides:
        assert page.text_character_count > 0, f"Page {page.slide_number} has no text"

    # Title heuristic (first line of text)
    assert result.slides[0].title, "Page 1 title should not be empty"

    # Image count is a non-negative integer
    for page in result.slides:
        assert page.image_count >= 0

    print(f"       Extracted {result.metadata.total_slides} pages, "
          f"total chars: {sum(s.text_character_count for s in result.slides)}")


# ---------------------------------------------------------------------------
# Test 3: Empty file
# ---------------------------------------------------------------------------


def test_empty_file():
    raised = False
    try:
        validate_upload(b"", "empty_file.pptx")
    except ExtractionError as e:
        raised = True
        assert "empty" in str(e).lower(), f"Wrong error message: {e}"
    assert raised, "Empty file should raise ExtractionError"


# ---------------------------------------------------------------------------
# Test 4: Unsupported file type
# ---------------------------------------------------------------------------


def test_unsupported_extension():
    raised = False
    try:
        validate_upload(b"some content", "slide.ppt")
    except ExtractionError as e:
        raised = True
        assert ".ppt" in str(e), f"Wrong error message: {e}"
    assert raised, "Unsupported extension should raise ExtractionError"


def test_unsupported_extension_docx():
    raised = False
    try:
        validate_upload(b"some content", "document.docx")
    except ExtractionError as e:
        raised = True
        assert ".docx" in str(e), f"Wrong error message: {e}"
    assert raised, "Unsupported .docx extension should raise ExtractionError"


# ---------------------------------------------------------------------------
# Test 5: Oversized file
# ---------------------------------------------------------------------------


def test_oversized_file():
    # Generate just enough to exceed 20 MB without actually allocating 20 MB of real data
    # We'll use a mock content of exactly 20 MB + 1 byte
    oversized = b"A" * (MAX_FILE_SIZE_BYTES + 1)
    raised = False
    try:
        validate_upload(oversized, "big_file.pdf")
    except ExtractionError as e:
        raised = True
        assert "20 MB" in str(e) or "limit" in str(e).lower(), f"Wrong error message: {e}"
    assert raised, "Oversized file should raise ExtractionError"


# ---------------------------------------------------------------------------
# Test 6: Path traversal safe filename
# ---------------------------------------------------------------------------


def test_path_traversal_filename():
    # Should not raise on the file size/empty check, but must safely extract ext
    malicious_filename = "../../etc/passwd.exe"
    raised = False
    try:
        validate_upload(b"something", malicious_filename)
    except ExtractionError as e:
        raised = True
        assert ".exe" in str(e) or "Unsupported" in str(e), f"Wrong error: {e}"
    assert raised, "Path traversal filename with bad extension should raise ExtractionError"


# ---------------------------------------------------------------------------
# Test 7: Bad magic bytes
# ---------------------------------------------------------------------------


def test_bad_magic_pdf():
    # Valid extension, wrong content
    fake_pdf = b"NOT A PDF - just garbage content here"
    raised = False
    try:
        validate_upload(fake_pdf, "fake.pdf")
    except ExtractionError as e:
        raised = True
        assert "PDF" in str(e) or "header" in str(e).lower(), f"Wrong error: {e}"
    assert raised, "Fake PDF should raise ExtractionError"


def test_bad_magic_pptx():
    # Valid extension, wrong content
    fake_pptx = b"NOT A ZIP FILE - just garbage content"
    raised = False
    try:
        validate_upload(fake_pptx, "fake.pptx")
    except ExtractionError as e:
        raised = True
        assert "ZIP" in str(e) or "PPTX" in str(e) or "header" in str(e).lower(), f"Wrong error: {e}"
    assert raised, "Fake PPTX should raise ExtractionError"


# ---------------------------------------------------------------------------
# Test 8: Existing Project Validation schemas unaffected
# ---------------------------------------------------------------------------


def test_existing_schemas_unaffected():
    from app.schemas.evaluation import (
        CriterionScore,
        EvaluationRequest,
        EvaluationResponse,
        Finding,
        FindingType,
        Severity,
    )
    from app.schemas.ppt import (
        PPTEvaluationResponse,
        RequirementMatch,
        SlideAnalysis,
        TemplateRequirement,
    )
    # Quick sanity instantiation
    score = CriterionScore(criterion="Innovation", score=8.5, explanation="Good")
    assert score.score == 8.5


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


def main():
    print("\n" + "=" * 60)
    print("  BuddyJudge Phase 2 - Extraction Service Tests")
    print("=" * 60 + "\n")

    tests = [
        ("Valid PPTX extraction", test_valid_pptx),
        ("Valid PDF extraction", test_valid_pdf),
        ("Empty file rejected", test_empty_file),
        ("Unsupported extension (.ppt) rejected", test_unsupported_extension),
        ("Unsupported extension (.docx) rejected", test_unsupported_extension_docx),
        ("Oversized file (>20 MB) rejected", test_oversized_file),
        ("Path traversal filename safe", test_path_traversal_filename),
        ("Bad magic bytes - PDF", test_bad_magic_pdf),
        ("Bad magic bytes - PPTX", test_bad_magic_pptx),
        ("Existing Project Validation schemas unaffected", test_existing_schemas_unaffected),
    ]

    for name, fn in tests:
        run_test(name, fn)

    print("\n" + "=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"  Results: {passed}/{total} passed")
    if passed == total:
        print("  ALL TESTS PASSED")
    else:
        print("  SOME TESTS FAILED:")
        for name, ok, err in results:
            if not ok:
                print(f"    - {name}: {err}")
    print("=" * 60 + "\n")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
