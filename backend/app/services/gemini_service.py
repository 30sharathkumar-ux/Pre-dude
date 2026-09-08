"""
gemini_service.py

Initialises the Google GenAI client from the GEMINI_API_KEY environment
variable loaded from the local .env file.

Security rules:
  - The key is loaded ONLY from the environment (never hardcoded).
  - The key is NEVER logged or returned in responses.
  - This module must NEVER be imported by the frontend.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Load variables from backend/.env into the process environment.
# Has no effect when the variable is already set (e.g. in production).
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# ---- Model -----------------------------------------------------------------
# gemini-2.5-flash is the latest stable Flash model available in the
# google-genai SDK as of September 2026.
# Update this constant when a newer stable Flash model is released.
GEMINI_MODEL = "gemini-3.6-flash"

# ---- Client (lazy) ---------------------------------------------------------
# The client is created on first use, NOT at import time.
# This ensures the FastAPI app boots and registers all routes even when
# GEMINI_API_KEY has not yet been configured — the endpoint simply returns
# an HTTP error instead of crashing the whole server.

_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Return the shared Gemini client, creating it on first call.

    Raises
    ------
    RuntimeError
        If GEMINI_API_KEY is missing or still set to the placeholder.
    """
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "PASTE_MY_KEY_HERE":
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Open backend/.env and replace PASTE_MY_KEY_HERE with your real key."
        )

    _client = genai.Client(api_key=api_key)
    return _client
