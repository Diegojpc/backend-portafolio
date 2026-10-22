---
name: verify
description: Definition of done for this repo (no test suite exists). Runs lint, production build, backend import check and i18n parity, then the perf-check/ui-audit skills when the diff warrants it. Use before saying work is finished, before a commit, or when asked to verify/check everything.
---

# verify

Report exactly what ran and what failed. Never summarise a failure as a pass, and say plainly which steps you skipped and why.

1. **Scope**: `git diff --name-only HEAD` (plus untracked via `git status --short`) decides which steps apply.
2. **Frontend** (if `frontend/` changed): in `frontend/`, `npm run lint` then `npm run build`. Show the error lines, not a paraphrase.
3. **Backend** (if `backend/` changed): in `backend/` with `.venv` active, `python -c "import app.main"` (catches syntax, import and settings errors; needs a valid `.env`). If `entities.py` changed, check that `alembic/versions/` has a matching migration.
4. **i18n** (if `frontend/src/locales/` or any `t('...')` call changed): `node .claude/skills/i18n-sync/check_keys.mjs`.
5. **Browser checks**, only when relevant and only if dev servers are already running (never start them yourself):
   - touched `frontend/src/components/canvas/`, `App.jsx` or lazy loading → run the `perf-check` skill
   - touched `ChatWidget.jsx`, `call/VoiceCall.jsx`, locales or global layout → run the `ui-audit` skill
6. **Result**: a short table — step, command, pass/fail/skipped — then the list of failures with `file:line`.

There are no automated tests. State that explicitly when reporting, so a green run is not mistaken for tested behaviour.
