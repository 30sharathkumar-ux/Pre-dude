# BuddyJudge — Backend

FastAPI backend for BuddyJudge. Currently provides the API foundation; AI evaluation will be connected in a future phase.

---

## Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv .venv
```

Activate it:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source .venv/bin/activate`

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in values when they are available. Leave placeholders empty for now.

### 4. Start the development server

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Available Endpoints

| Method | URL                         | Description                   |
|--------|-----------------------------|-------------------------------|
| GET    | `/api/health`               | Health check                  |
| GET    | `/api/projects/test`        | Project validation connectivity test |
| GET    | `/api/ppt/test`             | PPT analyzer connectivity test |

### Health check

```
http://localhost:8000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "BuddyJudge API"
}
```

### Interactive API docs (Swagger UI)

```
http://localhost:8000/docs
```

### ReDoc

```
http://localhost:8000/redoc
```

---

## Status

| Feature              | Status             |
|----------------------|--------------------|
| FastAPI foundation   | ✅ Done            |
| CORS (Vite dev)      | ✅ Done            |
| Health endpoint      | ✅ Done            |
| Project router       | ✅ Stub ready      |
| PPT router           | ✅ Stub ready      |
| Gemini integration   | ⏳ Next phase      |
| Supabase integration | ⏳ Next phase      |
| File upload          | ⏳ Next phase      |
