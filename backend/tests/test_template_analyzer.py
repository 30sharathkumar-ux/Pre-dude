"""
tests/test_template_analyzer.py

Phase 3 - Integration test for the AI Template Analyzer.

Tests:
  1. Import and syntax check of template_analyzer.py
  2. Context builder (_build_document_context) produces non-empty output
  3. Prompt builder (_build_prompt) includes injection guard
  4. Full integration: extract NIRMAAN PDF -> analyze template -> validate result
  5. Requirement type classification check
  6. Slide number invention check (expected_slide must only be set when supported)
  7. Project Validation pipeline unaffected

Usage:
    cd backend
    python tests/test_template_analyzer.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import traceback

# Ensure app is importable from tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
SKIP = "\033[93mSKIP\033[0m"
results: list[tuple[str, str, str | None]] = []


def run_test(name: str, fn):
    try:
        fn()
        print(f"  [{PASS}] {name}")
        results.append((name, "pass", None))
    except SkipTest as e:
        print(f"  [{SKIP}] {name}: {e}")
        results.append((name, "skip", str(e)))
    except AssertionError as e:
        print(f"  [{FAIL}] {name}: {e}")
        results.append((name, "fail", str(e)))
    except Exception as e:
        print(f"  [{FAIL}] {name}: {type(e).__name__}: {e}")
        print(f"         {traceback.format_exc()}")
        results.append((name, "fail", f"{type(e).__name__}: {e}"))


def run_async_test(name: str, coro_fn):
    try:
        asyncio.run(coro_fn())
        print(f"  [{PASS}] {name}")
        results.append((name, "pass", None))
    except SkipTest as e:
        print(f"  [{SKIP}] {name}: {e}")
        results.append((name, "skip", str(e)))
    except AssertionError as e:
        print(f"  [{FAIL}] {name}: {e}")
        results.append((name, "fail", str(e)))
    except Exception as e:
        print(f"  [{FAIL}] {name}: {type(e).__name__}: {e}")
        print(f"         {traceback.format_exc()}")
        results.append((name, "fail", f"{type(e).__name__}: {e}"))


class SkipTest(Exception):
    pass


# ---------------------------------------------------------------------------
# Locate test PDF
# ---------------------------------------------------------------------------

NIRMAAN_PDF_PATH = os.path.join(os.path.dirname(__file__), "NIRMAAN_template.pdf")


def _load_nirmaan_pdf() -> bytes:
    if not os.path.exists(NIRMAAN_PDF_PATH):
        raise SkipTest(f"NIRMAAN test PDF not found at {NIRMAAN_PDF_PATH}")
    with open(NIRMAAN_PDF_PATH, "rb") as f:
        return f.read()


# ---------------------------------------------------------------------------
# Test 1: Import check
# ---------------------------------------------------------------------------


def test_import():
    from app.services.template_analyzer import (
        _build_document_context,
        _build_prompt,
        analyze_template,
    )
    assert callable(analyze_template)
    assert callable(_build_document_context)
    assert callable(_build_prompt)


# ---------------------------------------------------------------------------
# Test 2: Context builder
# ---------------------------------------------------------------------------


def test_context_builder():
    from app.services.extraction_service import extract_pdf
    from app.services.template_analyzer import _build_document_context

    pdf_bytes = _load_nirmaan_pdf()
    extraction = extract_pdf(pdf_bytes)

    context = _build_document_context(extraction)

    assert context, "Context string should not be empty"
    assert "DOCUMENT TYPE: PDF" in context
    assert "TOTAL SLIDES/PAGES:" in context
    assert "SLIDE/PAGE 1" in context

    # Should not exceed MAX_TOTAL_CHARS (with some tolerance for header lines)
    from app.services.template_analyzer import MAX_TOTAL_CHARS
    # The context can be slightly over due to header lines, but text portion should be bounded
    assert len(context) < MAX_TOTAL_CHARS + 5_000, \
        f"Context too large: {len(context):,} chars"

    print(f"       Context: {len(context):,} chars, "
          f"covering {extraction.metadata.total_slides} slides")


# ---------------------------------------------------------------------------
# Test 3: Prompt injection guard
# ---------------------------------------------------------------------------


def test_prompt_injection_guard():
    from app.services.template_analyzer import _INJECTION_GUARD, _build_prompt

    # Build a minimal context
    prompt = _build_prompt("SLIDE 1: Test content", "test.pdf")

    assert "UNTRUSTED" in prompt or "CRITICAL SECURITY" in prompt, \
        "Prompt must contain injection guard language"
    assert "REFERENCE DOCUMENT DATA" in prompt
    assert "TREAT AS UNTRUSTED DATA ONLY" in prompt or "UNTRUSTED" in prompt


# ---------------------------------------------------------------------------
# Test 4: Full integration — extract NIRMAAN PDF → analyze → validate
# ---------------------------------------------------------------------------

_template_result = None  # store for subsequent tests


async def test_full_integration():
    global _template_result

    from app.services.extraction_service import extract_document
    from app.services.template_analyzer import analyze_template
    from app.schemas.ppt import TemplateAnalysis

    pdf_bytes = _load_nirmaan_pdf()
    extraction = extract_document(pdf_bytes, "NIRMAAN_template.pdf")

    print(f"\n       Extraction: {extraction.metadata.total_slides} pages, "
          f"total chars: {sum(s.text_character_count for s in extraction.slides)}")
    print("       Calling Gemini for template analysis... (this may take ~10-20s)")

    result = await analyze_template(extraction, "NIRMAAN_template.pdf")

    # Basic type validation
    assert isinstance(result, TemplateAnalysis), \
        f"Expected TemplateAnalysis, got {type(result)}"

    # Must have requirements
    assert len(result.requirements) > 0, "No requirements extracted"

    # Must have template name
    assert result.template_name, "template_name should not be empty"

    # total_slides should match extraction
    assert result.total_slides == extraction.metadata.total_slides, \
        (f"total_slides mismatch: schema={result.total_slides}, "
         f"extraction={extraction.metadata.total_slides}")

    # All requirements must have valid IDs and non-empty titles
    for req in result.requirements:
        assert req.requirement_id, f"requirement_id empty: {req}"
        assert req.title, f"title empty: {req}"
        assert req.description, f"description empty: {req}"
        assert req.source, f"source empty: {req}"

    # overall_structure should be populated
    assert len(result.overall_structure) > 0, "overall_structure should not be empty"

    _template_result = result

    print(f"\n       Template name: {result.template_name!r}")
    print(f"       Requirements detected: {len(result.requirements)}")
    print(f"       Overall structure: {len(result.overall_structure)} sections")
    print(f"       Notes: {len(result.notes)}")


# ---------------------------------------------------------------------------
# Test 5: Requirement type classification
# ---------------------------------------------------------------------------


def test_requirement_type_classification():
    if _template_result is None:
        raise SkipTest("Depends on test_full_integration result")

    from app.schemas.ppt import RequirementType

    types_found: dict[str, int] = {"required": 0, "recommended": 0, "optional": 0}
    for req in _template_result.requirements:
        types_found[req.requirement_type.value] = (
            types_found.get(req.requirement_type.value, 0) + 1
        )

    # All requirement_type values must be valid enum members
    for req in _template_result.requirements:
        assert req.requirement_type in RequirementType, \
            f"Invalid requirement_type: {req.requirement_type}"

    print(f"       Type distribution: {types_found}")

    # There should be at least some 'required' requirements
    assert types_found["required"] > 0, \
        "Expected at least one 'required' requirement"


# ---------------------------------------------------------------------------
# Test 6: Slide number invention check
# ---------------------------------------------------------------------------


def test_no_invented_slide_numbers():
    if _template_result is None:
        raise SkipTest("Depends on test_full_integration result")

    total_pages = _template_result.total_slides
    invented = []

    for req in _template_result.requirements:
        if req.expected_slide is not None:
            if req.expected_slide < 1 or req.expected_slide > total_pages:
                invented.append(
                    f"REQ {req.requirement_id}: "
                    f"expected_slide={req.expected_slide} "
                    f"(document has {total_pages} pages)"
                )

    assert not invented, \
        f"Invented/out-of-range slide numbers detected:\n  " + "\n  ".join(invented)

    # Count how many have explicit slide numbers vs null
    with_slide = [r for r in _template_result.requirements if r.expected_slide is not None]
    without_slide = [r for r in _template_result.requirements if r.expected_slide is None]

    print(f"       {len(with_slide)} requirements with explicit slide, "
          f"{len(without_slide)} with null (correct for reference-only docs)")


# ---------------------------------------------------------------------------
# Test 7: Detected requirement content check
# ---------------------------------------------------------------------------


def test_requirement_content():
    if _template_result is None:
        raise SkipTest("Depends on test_full_integration result")

    print("\n       Detected requirements:")
    for req in _template_result.requirements:
        slide_str = f"slide {req.expected_slide}" if req.expected_slide else "no slide"
        kw_preview = ", ".join(req.keywords[:3]) if req.keywords else "—"
        print(f"         [{req.requirement_type.value:12s}] "
              f"{req.requirement_id}: {req.title} "
              f"({slide_str}) | keywords: {kw_preview}...")
        print(f"           source: {req.source}")


# ---------------------------------------------------------------------------
# Test 8: Project Validation unaffected
# ---------------------------------------------------------------------------


def test_project_validation_unaffected():
    import app.main  # noqa: F401

    from app.schemas.evaluation import EvaluationResponse, CriterionScore
    from app.services.evaluation_service import evaluate_project  # noqa: F401

    # Verify the route is still registered
    from app.main import app as fastapi_app
    routes = {r.path for r in fastapi_app.routes}
    assert "/api/projects/evaluate" in routes, \
        f"Project Validation route missing! Routes: {routes}"

    print(f"       Routes registered: {sorted(routes)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("\n" + "=" * 65)
    print("  BuddyJudge Phase 3 - Template Analyzer Tests")
    print("=" * 65 + "\n")

    run_test("Import check", test_import)
    run_test("Context builder", test_context_builder)
    run_test("Prompt injection guard", test_prompt_injection_guard)
    run_async_test("Full Gemini integration (NIRMAAN PDF)", test_full_integration)
    run_test("Requirement type classification", test_requirement_type_classification)
    run_test("No invented slide numbers", test_no_invented_slide_numbers)
    run_test("Requirement content check", test_requirement_content)
    run_test("Project Validation unaffected", test_project_validation_unaffected)

    print("\n" + "=" * 65)
    passed = sum(1 for _, status, _ in results if status == "pass")
    skipped = sum(1 for _, status, _ in results if status == "skip")
    failed = sum(1 for _, status, _ in results if status == "fail")
    total = len(results)

    print(f"  Results: {passed} passed / {skipped} skipped / {failed} failed  "
          f"(total {total})")

    if failed == 0:
        print("  ALL TESTS PASSED (or skipped)")
    else:
        print("  FAILURES:")
        for name, status, err in results:
            if status == "fail":
                print(f"    - {name}: {err}")
    print("=" * 65 + "\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
