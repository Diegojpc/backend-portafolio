# Diego's 3D Portfolio + AI Assistant

Interactive 3D portfolio with an AI assistant that answers questions about Diego from his CV, by text chat and by voice call.

```
frontend/   React 18 + Three.js (react-three-fiber), Vite, Tailwind, GSAP, Framer Motion
backend/    FastAPI (async), SQLite, Gemini (google-genai), Fish Audio TTS
docs/       AWS deployment design, setup guide and cost estimate
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`frontend/.env` (gitignored) only needs the EmailJS keys for the contact form:
`VITE_APP_EMAILJS_SERVICE_ID`, `VITE_APP_EMAILJS_TEMPLATE_ID`, `VITE_APP_EMAILJS_PUBLIC_KEY`.

> The chat widget picks its backend automatically: `npm run dev` uses `http://localhost:8000`,
> production builds use the Render deployment. Override with `VITE_BACKEND_URL` in `frontend/.env`.
> If a feature you enabled locally (e.g. the voice button) does not show up, check the browser's
> network tab: the widget may be talking to a different backend than the one you started.

## Run the backend

Requires [uv](https://docs.astral.sh/uv/) and Python 3.12.

**bash / zsh**
```bash
cd backend
uv venv .venv --python 3.12
source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env          # then edit .env (see below)
uvicorn app.main:app --reload --port 8000
```

**fish** — the stock `activate` script is bash-only; use `activate.fish`:
```fish
cd backend
uv venv .venv --python 3.12
uv pip install -r requirements.txt     # uv finds ./.venv by itself
cp .env.example .env                   # then edit .env (see below)
source .venv/bin/activate.fish
uvicorn app.main:app --reload --port 8000
```

You can skip activation entirely in any shell: `.venv/bin/uvicorn app.main:app --reload --port 8000`.
If you see `uvicorn: command not found`, the venv is not active or the dependencies were not installed into it.

Check it works: `curl http://localhost:8000/health` should return `"rag_ready": true`.

### Environment (`backend/.env`)

Copy `backend/.env.example`. Required: `DATABASE_URL`, `APP_SECRET` (32+ chars), `GEMINI_API_KEY`
(from [Google AI Studio](https://aistudio.google.com/apikey)), `CORS_ORIGINS`.
`MODEL_NAME` defaults to `gemini-3.8-flash`. If `GEMINI_API_KEY` is invalid the server starts but chat fails; look for `[RAG] Error verifying Gemini connectivity` in the log.

### Database

Tables are created automatically on startup, so migrations are optional locally. In production run them with Alembic from `backend/`.
Alembic reads `DATABASE_URL` from the process environment, not from `.env`:

```bash
DATABASE_URL=sqlite+aiosqlite:///./storage/portfolio.db alembic upgrade head
```

### Voice call (optional)

Disabled by default. To enable it, set in `backend/.env`:
`REALTIME_ENABLED=true`, `FISH_API_KEY`, `FISH_VOICE_ID` (a voice cloned on [fish.audio](https://fish.audio)).
Optional tuning, no code or re-cloning needed: `FISH_SPEED` (default 1.15; 1.0 is the clone's natural pace), `FISH_SPEED_EN`, `FISH_TEMPERATURE` (higher = more expressive),
and `FISH_VOICE_ID_EN` (a second clone, e.g. recorded speaking English, used for English sentences; Spanish keeps `FISH_VOICE_ID`).
The microphone button appears in the chat widget only when `/health` reports `"realtime_voice": true`.
Speech-to-text uses the browser's recognition when it works (Chrome, Edge) and otherwise falls back to server-side transcription with Gemini (Brave, Firefox, Chromium builds without Google keys), so the call works in any modern browser; in that case the visitor's audio is sent to Google Gemini (the call panel says so). Cost guards: 12 requests/min per IP,
12 turns per call and a global daily cap of TTS characters (`REALTIME_DAILY_CHARS`).

### Knowledge base

The assistant answers from the files in `backend/data/` (CV PDFs and `diego_profile.md`), loaded at startup.
Edit them and restart the server to change what it knows.

## Build for production

```bash
cd frontend && npm run build   # → frontend/dist/
```

Backend container: `backend/Dockerfile`. See `docs/` for the AWS deployment design.

## License
Private
