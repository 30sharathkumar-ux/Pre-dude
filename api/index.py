"""
Vercel Python serverless adapter.

Vercel's Python runtime calls this file for every request matched by the
/api/(.*) rewrite rule.  We add the backend package to sys.path so that
`app.main` can be imported with its existing absolute imports intact, then
re-export the FastAPI application object as `app`.

Vercel looks for a top-level variable named `app` (ASGI) or `handler`
(WSGI/plain callable) in this module.
"""

import sys
import os

# Make `backend/` importable so `from app.main import app` resolves correctly.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402  (import not at top of file is intentional)

__all__ = ["app"]
