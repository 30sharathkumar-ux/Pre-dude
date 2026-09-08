"""
services/url_analyzer.py

Fetches a publicly accessible website URL and extracts useful evidence
for AI-powered project evaluation.

Security rules:
  - Only http/https schemes are allowed.
  - SSRF protection: private/loopback/link-local IPs are blocked.
  - Hard timeout of 12 seconds.
  - Response body capped at 512 KB.
  - HTML is parsed with BeautifulSoup — no JavaScript execution.
  - Only the submitted URL is fetched (no recursive crawling).
  - No secrets are logged or returned.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_FETCH_TIMEOUT = 12          # seconds
_MAX_BYTES     = 512 * 1024  # 512 KB

_BLOCKED_PRIVATE_NETS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),        # loopback
    ipaddress.ip_network("169.254.0.0/16"),     # link-local
    ipaddress.ip_network("::1/128"),             # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),            # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),           # IPv6 link-local
    ipaddress.ip_network("100.64.0.0/10"),       # carrier-grade NAT
    ipaddress.ip_network("0.0.0.0/8"),           # "this" network
]

_FRAMEWORK_HINTS = {
    "React":       ["react", "__next", "_react", "data-reactroot", "data-reactid"],
    "Next.js":     ["__next", "_next/static", "__NEXT_DATA__"],
    "Vue.js":      ["vue", "data-v-", "__vue"],
    "Angular":     ["angular", "ng-version", "ng-app"],
    "Svelte":      ["svelte", "__SVELTE"],
    "Django":      ["csrfmiddlewaretoken", "django"],
    "Flask":       ["flask", "werkzeug"],
    "Express":     ["express"],
    "WordPress":   ["wp-content", "wp-includes", "wordpress"],
    "Bootstrap":   ["bootstrap", "btn-primary", "navbar-brand"],
    "Tailwind":    ["tailwind", "tw-"],
}


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class WebsiteEvidence:
    url: str
    reachable: bool
    error: Optional[str]                   = None
    status_code: Optional[int]             = None
    title: Optional[str]                   = None
    meta_description: Optional[str]        = None
    headings: List[str]                    = field(default_factory=list)
    body_excerpt: Optional[str]            = None
    link_count: int                        = 0
    detected_frameworks: List[str]         = field(default_factory=list)
    content_type: Optional[str]            = None
    response_size_kb: Optional[float]      = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _validate_url(url: str) -> str:
    """
    Check scheme and strip whitespace. Return the cleaned URL.
    Raise ValueError on invalid input.
    """
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Only http/https URLs are allowed. Got scheme: '{parsed.scheme or '(none)'}'")
    if not parsed.netloc:
        raise ValueError("URL has no host.")
    return url


def _ssrf_guard(hostname: str) -> None:
    """
    Resolve the hostname and raise if it points to a private/internal address.
    This prevents SSRF (Server-Side Request Forgery) attacks.
    """
    try:
        # getaddrinfo returns a list of (family, type, proto, canonname, sockaddr)
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        # DNS resolution failed — we can't reach the host; let httpx fail naturally.
        return

    for res in results:
        raw_ip = res[4][0]
        try:
            addr = ipaddress.ip_address(raw_ip)
        except ValueError:
            continue

        for net in _BLOCKED_PRIVATE_NETS:
            if addr in net:
                raise ValueError(
                    f"Requests to private/internal addresses are not allowed. "
                    f"Host '{hostname}' resolved to '{raw_ip}'."
                )


def _detect_frameworks(html: str) -> List[str]:
    """Scan raw HTML for common framework/library fingerprints."""
    found = []
    lower = html.lower()
    for framework, signals in _FRAMEWORK_HINTS.items():
        if any(sig in lower for sig in signals):
            found.append(framework)
    return found


def _clean_text(text: str, max_chars: int = 300) -> str:
    """Collapse whitespace and truncate to max_chars."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_chars:
        text = text[:max_chars] + "…"
    return text


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def analyze_website(url: str) -> WebsiteEvidence:
    """
    Fetch `url` and return extracted evidence for the AI evaluator.

    This function NEVER raises — all errors are captured in the returned
    WebsiteEvidence with reachable=False.

    Parameters
    ----------
    url : str
        The URL submitted by the user.

    Returns
    -------
    WebsiteEvidence
        Structured evidence, or an error description if unreachable.
    """
    # --- Validate URL scheme ---
    try:
        url = _validate_url(url)
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
    except ValueError as exc:
        return WebsiteEvidence(url=url, reachable=False, error=str(exc))

    # --- SSRF guard ---
    try:
        _ssrf_guard(hostname)
    except ValueError as exc:
        return WebsiteEvidence(url=url, reachable=False, error=str(exc))

    # --- Fetch ---
    headers = {
        "User-Agent": (
            "BuddyJudge-Analyzer/1.0 (AI project evaluation tool; "
            "fetches publicly accessible project websites)"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=5,
            timeout=_FETCH_TIMEOUT,
            headers=headers,
        ) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        return WebsiteEvidence(
            url=url, reachable=False,
            error=f"Request timed out after {_FETCH_TIMEOUT}s."
        )
    except httpx.TooManyRedirects:
        return WebsiteEvidence(url=url, reachable=False, error="Too many redirects.")
    except httpx.RequestError as exc:
        return WebsiteEvidence(
            url=url, reachable=False,
            error=f"Could not connect: {type(exc).__name__}."
        )

    status_code = response.status_code
    content_type = response.headers.get("content-type", "")

    if status_code >= 400:
        return WebsiteEvidence(
            url=url, reachable=False,
            status_code=status_code,
            error=f"HTTP {status_code} response from server."
        )

    # --- Size guard ---
    raw_bytes = response.content[:_MAX_BYTES]
    size_kb = round(len(raw_bytes) / 1024, 1)

    # --- Only parse HTML ---
    if "text/html" not in content_type.lower() and "xhtml" not in content_type.lower():
        return WebsiteEvidence(
            url=url, reachable=True,
            status_code=status_code,
            content_type=content_type,
            response_size_kb=size_kb,
            error=f"Non-HTML response ({content_type}). Cannot extract page text."
        )

    html_text = raw_bytes.decode("utf-8", errors="replace")

    # --- Parse ---
    soup = BeautifulSoup(html_text, "lxml")

    # Remove boilerplate tags
    for tag in soup(["script", "style", "noscript", "svg", "iframe", "nav", "footer", "header"]):
        tag.decompose()

    title_tag = soup.find("title")
    title = _clean_text(title_tag.get_text()) if title_tag else None

    meta_desc = None
    for attr in [{"name": "description"}, {"property": "og:description"}]:
        meta = soup.find("meta", attrs=attr)
        if meta and meta.get("content"):
            meta_desc = _clean_text(meta["content"])
            break

    headings: List[str] = []
    for tag in soup.find_all(["h1", "h2", "h3"])[:12]:
        text = _clean_text(tag.get_text(), max_chars=120)
        if text:
            headings.append(f"[{tag.name.upper()}] {text}")

    # Extract a useful body excerpt from the first meaningful paragraphs
    paragraphs = []
    for p in soup.find_all("p"):
        text = _clean_text(p.get_text(), max_chars=200)
        if len(text) > 40:  # skip stub <p> tags
            paragraphs.append(text)
        if len(paragraphs) >= 5:
            break
    body_excerpt = " | ".join(paragraphs) if paragraphs else None

    link_count = len(soup.find_all("a", href=True))
    frameworks = _detect_frameworks(html_text)

    return WebsiteEvidence(
        url=url,
        reachable=True,
        status_code=status_code,
        content_type=content_type,
        response_size_kb=size_kb,
        title=title,
        meta_description=meta_desc,
        headings=headings,
        body_excerpt=body_excerpt,
        link_count=link_count,
        detected_frameworks=frameworks,
    )


def format_website_evidence(ev: WebsiteEvidence) -> str:
    """Return a human-readable evidence block for the Gemini prompt."""
    if not ev.reachable:
        reason = ev.error or "Unknown error"
        return (
            f"  URL: {ev.url}\n"
            f"  Status: [UNREACHABLE] — {reason}\n"
            f"  Note: The AI must NOT assume the website is functional or well-built.\n"
            f"        Treat absence of evidence as a significant weakness."
        )

    lines = [f"  URL: {ev.url}", f"  HTTP Status: {ev.status_code}"]
    if ev.response_size_kb is not None:
        lines.append(f"  Page Size: {ev.response_size_kb} KB")
    if ev.content_type:
        lines.append(f"  Content-Type: {ev.content_type}")
    if ev.title:
        lines.append(f"  Page Title: {ev.title}")
    if ev.meta_description:
        lines.append(f"  Meta Description: {ev.meta_description}")
    if ev.headings:
        lines.append(f"  Headings ({len(ev.headings)} found):")
        for h in ev.headings[:8]:
            lines.append(f"    - {h}")
    if ev.body_excerpt:
        lines.append(f"  Page Text Excerpt: {ev.body_excerpt}")
    lines.append(f"  Outbound Links: {ev.link_count}")
    if ev.detected_frameworks:
        lines.append(f"  Detected Technologies: {', '.join(ev.detected_frameworks)}")
    else:
        lines.append("  Detected Technologies: None identified from page source")
    if ev.error:
        lines.append(f"  Note: {ev.error}")
    return "\n".join(lines)
