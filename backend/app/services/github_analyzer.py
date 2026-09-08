"""
services/github_analyzer.py

Fetches public GitHub repository data via the GitHub REST API (no auth token
required for public repos) and extracts structured evidence for AI evaluation.

Security rules:
  - No authentication tokens are used or exposed.
  - Repository contents are treated as untrusted text — never executed.
  - HTTP timeout is enforced.
  - README is capped at 10 KB.
  - File tree is capped at 500 entries.
  - No secrets are logged or returned.
  - Only public repositories are accessed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_API_BASE      = "https://api.github.com"
_FETCH_TIMEOUT = 15          # seconds
_MAX_README    = 10 * 1024   # 10 KB
_MAX_TREE      = 500         # max file tree entries

_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "BuddyJudge-Analyzer/1.0 (AI project evaluation tool)",
}

# File-extension to technology category mappings
_TECH_INDICATORS: Dict[str, str] = {
    # Frontend
    ".jsx": "frontend",  ".tsx": "frontend",  ".vue": "frontend",
    ".svelte": "frontend", ".html": "frontend", ".css": "frontend",
    ".scss": "frontend", ".sass": "frontend", ".less": "frontend",
    # Backend
    ".py": "backend", ".go": "backend", ".java": "backend",
    ".rb": "backend", ".php": "backend", ".cs": "backend",
    ".rs": "backend", ".kt": "backend", ".ts": "backend",
    # ML / Data Science
    ".ipynb": "ml", ".pkl": "ml", ".h5": "ml", ".onnx": "ml",
    # Config
    ".yaml": "config", ".yml": "config", ".toml": "config",
    ".env": "config", ".ini": "config", ".json": "config",
    ".xml": "config",
    # Documentation
    ".md": "documentation", ".rst": "documentation", ".txt": "documentation",
}

_CONFIG_FILENAMES = {
    "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".dockerignore", "requirements.txt", "pyproject.toml", "setup.py",
    "setup.cfg", "package.json", "package-lock.json", "yarn.lock",
    "pnpm-lock.yaml", "go.mod", "go.sum", "cargo.toml", "gemfile",
    ".gitignore", "makefile", "readme.md", "license",
    "vercel.json", "netlify.toml",
}


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class GitHubEvidence:
    url: str
    owner: Optional[str]                        = None
    repo: Optional[str]                         = None
    found: bool                                 = False
    error: Optional[str]                        = None
    description: Optional[str]                  = None
    stars: Optional[int]                        = None
    forks: Optional[int]                        = None
    language: Optional[str]                     = None
    topics: List[str]                           = field(default_factory=list)
    last_pushed: Optional[str]                  = None
    default_branch: Optional[str]              = None
    readme_excerpt: Optional[str]              = None
    total_files: int                            = 0
    file_counts: Dict[str, int]                = field(default_factory=dict)
    detected_technologies: List[str]           = field(default_factory=list)
    notable_files: List[str]                   = field(default_factory=list)
    open_issues: Optional[int]                 = None
    license_name: Optional[str]               = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_github_url(url: str) -> tuple[str, str]:
    """
    Extract (owner, repo) from a GitHub URL.
    Supports formats:
      - https://github.com/owner/repo
      - https://github.com/owner/repo/
      - https://github.com/owner/repo.git
      - github.com/owner/repo
    Raises ValueError if the URL cannot be parsed.
    """
    url = url.strip()
    # Ensure scheme for urlparse
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if "github.com" not in host:
        raise ValueError(f"Not a GitHub URL. Expected github.com, got: '{host}'")

    # Clean the path
    path = parsed.path.strip("/").removesuffix(".git")
    parts = [p for p in path.split("/") if p]

    if len(parts) < 2:
        raise ValueError(
            f"Could not extract owner/repo from GitHub URL. "
            f"Expected https://github.com/owner/repo, got: '{url}'"
        )

    owner, repo = parts[0], parts[1]
    return owner, repo


def _categorise_files(tree_items: List[dict]) -> tuple[Dict[str, int], List[str], List[str]]:
    """
    Count files by technology category and collect notable config/root files.

    Returns
    -------
    counts : dict mapping category to count
    notable : list of noteworthy filenames
    tech_names : list of inferred technology names
    """
    counts: Dict[str, int] = {
        "frontend": 0, "backend": 0, "ml": 0,
        "config": 0, "documentation": 0, "other": 0,
    }
    notable: List[str] = []
    seen: set = set()

    for item in tree_items:
        if item.get("type") != "blob":
            continue
        path: str = item.get("path", "")
        basename = path.split("/")[-1].lower()
        _, _, ext = basename.rpartition(".")
        ext = "." + ext if ext else ""

        # Check extension
        category = _TECH_INDICATORS.get(ext)
        if category:
            counts[category] += 1
        else:
            counts["other"] += 1

        # Check for notable config files (root level or known names)
        if basename in _CONFIG_FILENAMES or path.count("/") == 0:
            if basename not in seen and len(notable) < 30:
                notable.append(path)
                seen.add(basename)

    # Infer technology names from counts
    tech_names: List[str] = []
    if counts["frontend"] > 0:
        tech_names.append("Frontend code detected")
    if counts["backend"] > 0:
        tech_names.append("Backend code detected")
    if counts["ml"] > 0:
        tech_names.append("ML/Data Science artifacts detected")
    if counts["config"] > 0:
        tech_names.append("Configuration/deployment files present")
    if counts["documentation"] > 0:
        tech_names.append("Documentation files present")

    return counts, notable, tech_names


def _truncate_readme(raw: str, max_bytes: int = _MAX_README) -> str:
    """Strip excessive whitespace and truncate README."""
    text = raw[:max_bytes]
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def analyze_github(url: str) -> GitHubEvidence:
    """
    Fetch public GitHub repository metadata and return structured evidence.

    This function NEVER raises — all errors are captured in the returned
    GitHubEvidence with found=False.

    Parameters
    ----------
    url : str
        The GitHub repository URL submitted by the user.

    Returns
    -------
    GitHubEvidence
        Structured evidence, or an error description if unavailable.
    """
    # --- Parse URL ---
    try:
        owner, repo = _parse_github_url(url)
    except ValueError as exc:
        return GitHubEvidence(url=url, error=str(exc))

    ev = GitHubEvidence(url=url, owner=owner, repo=repo)

    async with httpx.AsyncClient(
        timeout=_FETCH_TIMEOUT,
        headers=_HEADERS,
        follow_redirects=True,
    ) as client:

        # --- 1. Repository metadata ---
        try:
            r = await client.get(f"{_API_BASE}/repos/{owner}/{repo}")
        except httpx.TimeoutException:
            ev.error = f"GitHub API request timed out after {_FETCH_TIMEOUT}s."
            return ev
        except httpx.RequestError as exc:
            ev.error = f"Could not reach GitHub API: {type(exc).__name__}."
            return ev

        if r.status_code == 404:
            ev.error = "Repository not found or is private."
            return ev
        if r.status_code == 403:
            ev.error = "GitHub API rate limit reached or access forbidden."
            return ev
        if r.status_code != 200:
            ev.error = f"GitHub API returned HTTP {r.status_code}."
            return ev

        try:
            data = r.json()
        except Exception:
            ev.error = "Failed to parse GitHub API response."
            return ev

        ev.found          = True
        ev.description    = data.get("description") or None
        ev.stars          = data.get("stargazers_count")
        ev.forks          = data.get("forks_count")
        ev.language       = data.get("language") or None
        ev.topics         = data.get("topics", [])
        ev.last_pushed    = data.get("pushed_at") or None
        ev.default_branch = data.get("default_branch", "main")
        ev.open_issues    = data.get("open_issues_count")
        license_info      = data.get("license") or {}
        ev.license_name   = license_info.get("name") or None

        # Private repo check (belt-and-suspenders)
        if data.get("private"):
            ev.found  = False
            ev.error  = "Repository is private."
            return ev

        # --- 2. README ---
        try:
            readme_r = await client.get(
                f"{_API_BASE}/repos/{owner}/{repo}/readme",
                headers={**_HEADERS, "Accept": "application/vnd.github.raw"},
            )
            if readme_r.status_code == 200:
                raw_readme = readme_r.text[:_MAX_README]
                ev.readme_excerpt = _truncate_readme(raw_readme)
        except Exception:
            # README is optional; don't fail the whole analysis
            pass

        # --- 3. File tree (recursive) ---
        try:
            branch = ev.default_branch or "main"
            tree_r = await client.get(
                f"{_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}",
                params={"recursive": "1"},
            )
            if tree_r.status_code == 200:
                tree_data = tree_r.json()
                items = tree_data.get("tree", [])[:_MAX_TREE]
                ev.total_files = sum(1 for i in items if i.get("type") == "blob")
                counts, notable, tech_names = _categorise_files(items)
                ev.file_counts = counts
                ev.notable_files = notable
                ev.detected_technologies = tech_names
        except Exception:
            # File tree is optional; don't fail the whole analysis
            pass

    return ev


def format_github_evidence(ev: GitHubEvidence) -> str:
    """Return a human-readable evidence block for the Gemini prompt."""
    if not ev.found:
        reason = ev.error or "Unknown error"
        r_lower = reason.lower()
        if "private" in r_lower or "not found" in r_lower:
            label = "[PRIVATE / NOT FOUND]"
        elif "failed" in r_lower or "parse" in r_lower:
            label = "[ANALYSIS FAILED]"
        else:
            label = "[UNREACHABLE]"
        return (
            f"  URL: {ev.url}\n"
            f"  Status: {label} — {reason}\n"
            f"  Note: The AI must NOT assume the repository exists, is functional, or contains any code.\n"
            f"        Treat absence of GitHub evidence as a significant weakness."
        )

    lines = [
        f"  Repository: {ev.owner}/{ev.repo}",
        f"  URL: {ev.url}",
    ]

    if ev.description:
        lines.append(f"  Description: {ev.description}")
    else:
        lines.append("  Description: [NOT PROVIDED]")

    if ev.stars is not None:
        lines.append(f"  Stars: {ev.stars}")
    if ev.forks is not None:
        lines.append(f"  Forks: {ev.forks}")
    if ev.open_issues is not None:
        lines.append(f"  Open Issues: {ev.open_issues}")
    if ev.language:
        lines.append(f"  Primary Language: {ev.language}")
    if ev.topics:
        lines.append(f"  Topics: {', '.join(ev.topics)}")
    else:
        lines.append("  Topics: [NONE SET]")
    if ev.last_pushed:
        lines.append(f"  Last Pushed: {ev.last_pushed}")
    if ev.license_name:
        lines.append(f"  License: {ev.license_name}")
    if ev.default_branch:
        lines.append(f"  Default Branch: {ev.default_branch}")

    if ev.total_files > 0:
        lines.append(f"  Total Files (up to {_MAX_TREE}): {ev.total_files}")
        counts = ev.file_counts
        breakdown = []
        for cat in ("frontend", "backend", "ml", "config", "documentation", "other"):
            n = counts.get(cat, 0)
            if n > 0:
                breakdown.append(f"{cat}={n}")
        if breakdown:
            lines.append(f"  File Breakdown: {', '.join(breakdown)}")
    else:
        lines.append("  Total Files: 0 or could not be determined")

    if ev.detected_technologies:
        for t in ev.detected_technologies:
            lines.append(f"  - {t}")

    if ev.notable_files:
        shown = ev.notable_files[:20]
        lines.append(f"  Notable Files/Root Items ({len(shown)} shown):")
        for f in shown:
            lines.append(f"    - {f}")

    if ev.readme_excerpt:
        excerpt = ev.readme_excerpt[:2000]
        if len(ev.readme_excerpt) > 2000:
            excerpt += "\n  [README truncated...]"
        lines.append("  README (excerpt):")
        for line in excerpt.splitlines()[:60]:
            lines.append(f"    {line}")
    else:
        lines.append("  README: [NOT FOUND]")

    return "\n".join(lines)
