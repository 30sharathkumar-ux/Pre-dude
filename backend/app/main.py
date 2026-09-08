from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import health, projects, ppt

app = FastAPI(
    title="BuddyJudge API",
    version="1.0.0",
    description="Backend API for BuddyJudge — AI-powered project evaluation for students.",
)

# ---------------------------------------------------------------------------
# CORS
# Allow the Vite dev server during development.
# Do NOT use wildcard origins in production.
# ---------------------------------------------------------------------------
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health.router, prefix="/api")
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(ppt.router, prefix="/api/ppt", tags=["PPT Analyzer"])
