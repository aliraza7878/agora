# AGORA – The AI Debate Arena

Watch two AI philosophers debate, join in, get an impartial judgment, and experiment with live models in the AI Playground.
Everything runs on **the user's own Groq API key** (bring your own key). No key is stored in this repository or on the server.

## How keys work
1. A user opens **Settings** and pastes their Groq key (kept in `sessionStorage`, or `localStorage` if they choose "this device").
2. The browser sends it only as an `X-Provider-Key` header to the AGORA backend, over HTTPS in production.
3. The backend uses it for that single request. It is never written to disk, the database, or logs (log redaction is installed in `app/security.py`).
4. Optional hosted-demo mode: set `ALLOW_SERVER_KEY=true` and `GROQ_API_KEY` on the server. Off by default.

Caveat: a key saved on "this device" is readable by anyone with access to that browser profile. Do not use it on shared machines.

## Run locally
```bash
# Backend (Python 3.11+)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# Frontend (Node 18+), in another terminal
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api to :8000)
```
Open http://localhost:5173, go to **Settings**, paste your key, then **Enter the arena**.

## Environment variables
| Where | Name | Purpose |
|---|---|---|
| backend | `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| backend | `LLM_BASE_URL` | OpenAI-compatible endpoint (default Groq) |
| backend | `ALLOW_SERVER_KEY` / `GROQ_API_KEY` | Optional shared server key (default off) |
| backend | `MAX_BODY_BYTES` | Request size limit (default 262144) |
| frontend | `VITE_API_BASE` | Backend URL for production builds |

## Deploy
- **Frontend (Vercel):** root directory `frontend`, build `npm run build`, output `dist`, env `VITE_API_BASE=https://<your-backend>`.
- **Backend (Render / Railway / Fly.io):** root `backend`, install `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `CORS_ORIGINS` to your Vercel URL. Streaming responses need a host that does not buffer SSE.
- **Database (Supabase):** run `supabase/migrations/0001_init.sql` in the SQL editor.

## Layout
```
backend/app/
  providers/     LLMProvider interface + Groq adapter (swap for other OpenAI-compatible providers)
  debate/        personalities, prompts, context compaction, orchestrator, judge
  playground/    model_registry, model_capabilities, generation_service, model_comparison, code_export, prompt_manager
  security.py    BYOK header handling, log redaction, body-size limit
frontend/src/    pages (Home, Philosophers, DebateSetup, DebateArena, History, Playground, PromptLibrary, Settings)
supabase/        schema, indexes, row-level-security policies
```
Add a philosopher by appending one entry to `backend/app/debate/personalities.py`.

## Status: what is and is not verified
Verified in the build sandbox (no network): Python syntax for all backend modules; unit-style checks of round planning, judge score validation/clamping, transcript compaction, key redaction, model capability derivation and Python code-export validity (`backend/tests/test_logic.py`, run with `pytest` once dependencies are installed); loose TypeScript check of the frontend.

**Not yet run:** `npm install`/build, the FastAPI server, any live Groq call, and Supabase. Expect a first-run fix or two. Please report any error text.

## Known limitations (current phase)
- **History, audience votes, personal prompts and experiments are stored in the browser (localStorage).** The Supabase schema is ready, but the app is not yet connected to it (no sign-in or server-side persistence yet). Vote totals therefore reflect only votes cast on this device.
- Portraits are generated monogram medallions; set `portrait_url` later for real artwork.
- Parameter support per model is derived from live model metadata plus heuristics. If Groq rejects a parameter, the backend drops it, retries and reports it in the response notes.
- Reasoning models may emit chain-of-thought text. For debates, prefer non-reasoning chat models.
- Opening statements are generated independently (the second philosopher does not see the first's opening), as the spec's "independently" requires; every later turn sees the actual opposing arguments.
- Scores are computed server-side from per-category judge scores, which are validated and clamped to 0 to 100.
