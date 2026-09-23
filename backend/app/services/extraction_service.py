"""
services/extraction_service.py

Phase 2 - Document Extraction Engine
=====================================

Reusable, Gemini-agnostic service for extracting structured content from:
  - PPTX presentations  (.pptx via python-pptx)
  - PDF documents       (.pdf via PyMuPDF / fitz)

The output is a unified Pydantic model (ExtractionResult) that the future
Gemini evaluation service will consume for both Reference Template and
Student PPT analysis.

Security rules:
  - Uploaded bytes are treated as UNTRUSTED input.
  - Files are NEVER executed.
  - Temporary files are always cleaned up (contextlib).
  - Path traversal is not possible - all paths are resolved internally.
  - Sensitive document text is NOT logged at INFO level.
  - API keys are not touched here.

Supported formats:
  - .pptx  (PPTX only - legacy .ppt is NOT supported)
  - .pdf

Maximum file size: 20 MB
"""

from __future__ import annotations

import io
import logging
import os
import tempfile
from contextlib import contextmanager
from enum import Enum
from typing import Any, Dict, Generator, List, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_FILE_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB
SUPPORTED_EXTENSIONS: frozenset = frozenset({".pptx", ".pdf"})

# Magic bytes (file signatures) for supported types
_PPTX_MAGIC = b"PK"      # PPTX is a ZIP-based format
_PDF_MAGIC = b"%PDF"


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class FileType(str, Enum):
    pptx = "pptx"
    pdf = "pdf"


# ---------------------------------------------------------------------------
# Pydantic output models
# ---------------------------------------------------------------------------


class TextBlock(BaseModel):
    """A single text block extracted from a shape or text element."""

    shape_name: Optional[str] = Field(
        default=None,
        description="Name of the originating shape, if available"
    )
    shape_type: Optional[str] = Field(
        default=None,
        description="Type label of the shape (e.g. TITLE, BODY, TEXT_BOX)"
    )
    text: str = Field(default="", description="Full extracted text of this block")


class TableCell(BaseModel):
    row: int
    col: int
    text: str


class ExtractedTable(BaseModel):
    shape_name: Optional[str] = None
    rows: int
    cols: int
    cells: List[TableCell] = Field(default_factory=list)


class LayoutInfo(BaseModel):
    """Approximate positional / layout information for a slide."""

    width_emu: Optional[int] = None
    height_emu: Optional[int] = None
    shape_positions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of {name, left, top, width, height} dicts in EMU",
    )


class SlideExtraction(BaseModel):
    """Unified per-slide / per-page extraction result."""

    slide_number: int = Field(..., description="1-indexed slide or page number")
    title: str = Field(default="", description="Detected title (empty if none found)")
    text: str = Field(default="", description="Full concatenated visible text")
    text_blocks: List[TextBlock] = Field(
        default_factory=list,
        description="Text grouped by shape"
    )
    tables: List[ExtractedTable] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list, description="Hyperlinks found")
    image_count: int = Field(default=0)
    shape_count: int = Field(default=0)
    text_character_count: int = Field(default=0)
    layout_information: Optional[LayoutInfo] = None


class PresentationMetadata(BaseModel):
    """High-level metadata about the extracted document."""

    file_type: FileType
    total_slides: int = Field(..., description="Total number of slides or pages")
    filename: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    created: Optional[str] = None
    modified: Optional[str] = None
    slide_width_emu: Optional[int] = None   # PPTX only
    slide_height_emu: Optional[int] = None  # PPTX only


class ExtractionResult(BaseModel):
    """
    Top-level unified extraction result.

    This is the object the future Gemini service will receive for both
    the Reference Template and the Student PPT.
    """

    metadata: PresentationMetadata
    slides: List[SlideExtraction] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------


class ExtractionError(Exception):
    """Raised when a file cannot be validated or processed."""


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_upload(content: bytes, original_filename: str) -> FileType:
    """
    Validate uploaded bytes before extraction.

    Parameters
    ----------
    content:
        Raw bytes of the uploaded file.
    original_filename:
        The client-supplied filename (used ONLY to infer intended extension -
        the actual content type is verified against magic bytes).

    Returns
    -------
    FileType
        The detected file type.

    Raises
    ------
    ExtractionError
        On any validation failure.
    """
    # 1. Empty file guard
    if not content:
        raise ExtractionError("File is empty.")

    # 2. Size guard
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise ExtractionError(
            f"File size {len(content):,} bytes exceeds the 20 MB limit."
        )

    # 3. Extension check - strip path components to prevent path-traversal
    safe_name = os.path.basename(original_filename.replace("\\", "/"))
    _, ext = os.path.splitext(safe_name.lower())
    if ext not in SUPPORTED_EXTENSIONS:
        raise ExtractionError(
            f"Unsupported file extension '{ext}'. "
            f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    # 4. Magic-byte content validation
    if ext == ".pptx":
        if not content.startswith(_PPTX_MAGIC):
            raise ExtractionError(
                "File claims to be .pptx but does not have a valid ZIP/PPTX header."
            )
        return FileType.pptx

    if ext == ".pdf":
        if not content.startswith(_PDF_MAGIC):
            raise ExtractionError(
                "File claims to be .pdf but does not have a valid PDF header."
            )
        return FileType.pdf

    # Should be unreachable given the extension check above
    raise ExtractionError(f"Unhandled extension: {ext}")


# ---------------------------------------------------------------------------
# Temp file context manager
# ---------------------------------------------------------------------------


@contextmanager
def _temp_file(suffix: str, content: bytes) -> Generator[str, None, None]:
    """Write content to a secure temp file and guarantee cleanup on exit."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(content)
        yield path
    finally:
        try:
            os.unlink(path)
        except OSError:
            logger.warning("Could not delete temp file: %s", path)


# ---------------------------------------------------------------------------
# PPTX helpers
# ---------------------------------------------------------------------------


def _shape_type_label(shape) -> str:
    """Return a human-readable label for a python-pptx shape type."""
    try:
        ph = shape.placeholder_format
        if ph is not None:
            idx = ph.idx
            if idx == 0:
                return "TITLE"
            elif idx == 1:
                return "BODY"
            else:
                return f"PLACEHOLDER_{idx}"
    except Exception:
        pass
    try:
        return shape.shape_type.name
    except Exception:
        return "UNKNOWN"


def _extract_hyperlinks_from_shape(shape) -> List[str]:
    """Pull hyperlinks from a shape's text runs."""
    links: List[str] = []
    try:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                for run in para.runs:
                    try:
                        hl = run.hyperlink
                        if hl and hl.address:
                            links.append(hl.address)
                    except Exception:
                        pass
    except Exception:
        pass
    return links


# ---------------------------------------------------------------------------
# PPTX extraction
# ---------------------------------------------------------------------------


def extract_pptx(content: bytes) -> ExtractionResult:
    """
    Extract structured content from PPTX bytes.

    Parameters
    ----------
    content : bytes
        Raw bytes of a valid .pptx file.

    Returns
    -------
    ExtractionResult
    """
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE

    prs = Presentation(io.BytesIO(content))

    core_props = prs.core_properties
    slide_width = prs.slide_width
    slide_height = prs.slide_height

    metadata = PresentationMetadata(
        file_type=FileType.pptx,
        total_slides=len(prs.slides),
        title=core_props.title or None,
        author=core_props.author or None,
        subject=core_props.subject or None,
        created=str(core_props.created) if core_props.created else None,
        modified=str(core_props.modified) if core_props.modified else None,
        slide_width_emu=int(slide_width) if slide_width else None,
        slide_height_emu=int(slide_height) if slide_height else None,
    )

    slides: List[SlideExtraction] = []

    for idx, slide in enumerate(prs.slides, start=1):
        title_text = ""
        text_blocks: List[TextBlock] = []
        tables: List[ExtractedTable] = []
        links: List[str] = []
        image_count = 0
        shape_positions: List[Dict[str, Any]] = []

        # Detect title from title placeholder first
        try:
            ph_title = slide.shapes.title
            if ph_title is not None and ph_title.has_text_frame:
                title_text = ph_title.text_frame.text.strip()
        except Exception:
            pass

        for shape in slide.shapes:
            shape_label = _shape_type_label(shape)

            # Collect position info
            try:
                shape_positions.append({
                    "name": shape.name,
                    "left": shape.left,
                    "top": shape.top,
                    "width": shape.width,
                    "height": shape.height,
                })
            except Exception:
                pass

            # Hyperlinks
            links.extend(_extract_hyperlinks_from_shape(shape))

            # Image detection
            try:
                if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                    image_count += 1
                    continue
            except Exception:
                pass

            # Table extraction
            if shape.has_table:
                tbl = shape.table
                cells: List[TableCell] = []
                for r_idx, row in enumerate(tbl.rows):
                    for c_idx, cell in enumerate(row.cells):
                        cell_text = (
                            cell.text_frame.text.strip()
                            if cell.text_frame else ""
                        )
                        cells.append(TableCell(row=r_idx, col=c_idx, text=cell_text))
                tables.append(ExtractedTable(
                    shape_name=shape.name,
                    rows=len(tbl.rows),
                    cols=len(tbl.columns),
                    cells=cells,
                ))
                table_text = "\n".join(c.text for c in cells if c.text)
                if table_text:
                    text_blocks.append(TextBlock(
                        shape_name=shape.name,
                        shape_type="TABLE",
                        text=table_text,
                    ))
                continue

            # Text frame extraction
            if shape.has_text_frame:
                raw_text = shape.text_frame.text.strip()
                if raw_text:
                    text_blocks.append(TextBlock(
                        shape_name=shape.name,
                        shape_type=shape_label,
                        text=raw_text,
                    ))
                    # Fallback title logic
                    if not title_text and shape_label in ("TITLE", "PLACEHOLDER_0"):
                        title_text = raw_text
                    elif not title_text and idx == 1:
                        title_text = raw_text.split("\n")[0]

        # Final fallback: first text block
        if not title_text and text_blocks:
            title_text = text_blocks[0].text.split("\n")[0]

        full_text = "\n".join(tb.text for tb in text_blocks if tb.text)

        slides.append(SlideExtraction(
            slide_number=idx,
            title=title_text,
            text=full_text,
            text_blocks=text_blocks,
            tables=tables,
            links=list(dict.fromkeys(links)),  # deduplicate, preserve order
            image_count=image_count,
            shape_count=len(slide.shapes),
            text_character_count=len(full_text),
            layout_information=LayoutInfo(
                width_emu=int(slide_width) if slide_width else None,
                height_emu=int(slide_height) if slide_height else None,
                shape_positions=shape_positions,
            ),
        ))

    return ExtractionResult(metadata=metadata, slides=slides)


# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------


def extract_pdf(content: bytes) -> ExtractionResult:
    """
    Extract structured content from PDF bytes using PyMuPDF (fitz).

    Parameters
    ----------
    content : bytes
        Raw bytes of a valid .pdf file.

    Returns
    -------
    ExtractionResult
    """
    try:
        import pymupdf as fitz  # PyMuPDF >= 1.24 canonical import
    except ImportError:
        import fitz  # fallback for older installs

    doc = fitz.open(stream=content, filetype="pdf")

    raw_meta = doc.metadata or {}
    metadata = PresentationMetadata(
        file_type=FileType.pdf,
        total_slides=doc.page_count,
        title=raw_meta.get("title") or None,
        author=raw_meta.get("author") or None,
        subject=raw_meta.get("subject") or None,
        created=raw_meta.get("creationDate") or None,
        modified=raw_meta.get("modDate") or None,
    )

    slides: List[SlideExtraction] = []

    for page_idx in range(doc.page_count):
        page = doc[page_idx]
        page_num = page_idx + 1

        full_text = page.get_text("text").strip()

        # Title heuristic: first non-empty line
        title_text = ""
        lines = [ln.strip() for ln in full_text.splitlines() if ln.strip()]
        if lines:
            title_text = lines[0]

        text_blocks: List[TextBlock] = []
        if full_text:
            text_blocks.append(TextBlock(
                shape_name=None,
                shape_type="PAGE_TEXT",
                text=full_text,
            ))

        links: List[str] = []
        try:
            for link in page.get_links():
                uri = link.get("uri", "")
                if uri:
                    links.append(uri)
        except Exception:
            pass

        image_count = 0
        try:
            image_count = len(page.get_images(full=False))
        except Exception:
            pass

        slides.append(SlideExtraction(
            slide_number=page_num,
            title=title_text,
            text=full_text,
            text_blocks=text_blocks,
            tables=[],
            links=links,
            image_count=image_count,
            shape_count=0,
            text_character_count=len(full_text),
            layout_information=None,
        ))

    doc.close()
    return ExtractionResult(metadata=metadata, slides=slides)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def extract_document(content: bytes, original_filename: str) -> ExtractionResult:
    """
    Validate and extract content from an uploaded presentation file.

    This is the single public entry point the future API endpoint will call.

    Parameters
    ----------
    content : bytes
        Raw file bytes (from an UploadFile.read() call).
    original_filename : str
        The original filename as supplied by the client. Path components are
        stripped internally for security.

    Returns
    -------
    ExtractionResult
        Unified extraction result ready for Gemini consumption.

    Raises
    ------
    ExtractionError
        If the file is invalid, unsupported, or cannot be parsed.
    """
    file_type = validate_upload(content, original_filename)
    logger.info(
        "Extracting %s document — %d bytes",
        file_type.value,
        len(content),
    )

    if file_type == FileType.pptx:
        return extract_pptx(content)
    if file_type == FileType.pdf:
        return extract_pdf(content)

    raise ExtractionError(f"No extractor implemented for file type: {file_type}")
