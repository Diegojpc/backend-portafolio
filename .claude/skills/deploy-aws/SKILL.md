---
name: deploy-aws
description: Pre-flight checklist and guided deploy of the backend to AWS App Runner (ECR image, secrets, health check, voice kill switch). Manual only — it changes production.
disable-model-invocation: true
---

# deploy-aws

Source of truth: `docs/aws-setup-guide.md` (steps) and `docs/architecture.md`. Read them first; do not rely on this summary. Never run an AWS command that creates, updates or deletes resources without showing it to the user and getting a yes for that specific command.

Pre-flight (read-only, report each as pass/fail):
1. Branch and tree: `git status` clean, on the intended branch, the commit to deploy is pushed.
2. `verify` skill passes (lint, build, backend import).
3. `backend/Dockerfile` builds locally: `docker build -t portfolio-backend backend/`; container starts and `curl -f http://localhost:8000/health` succeeds.
4. Database: `docs/` describe PostgreSQL/RDS but `app/database.py` is hard-wired to SQLite. Confirm which one the target actually uses before deploying; a `postgresql+asyncpg://` URL will not work without changing that file.
5. Secrets: `APP_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`, `CORS_ORIGINS` (exact frontend origin, not `*`) come from Secrets Manager, not the image or git. `ENABLE_DOCS=false`.
6. Voice: decide `REALTIME_ENABLED` deliberately — it spends money per visitor. If true, `FISH_API_KEY`, `REALTIME_DAILY_CHARS` and `REALTIME_MAX_TURNS` must be set.
7. Rate limiting: remind the user that limiters key on the remote address; behind App Runner verify real client IPs reach the app (see `security-auditor`).

Deploy: follow Steps 2–3 and the App Runner step of the guide (ECR login, build, tag, push, service update) one command at a time. After the rollout: `curl -f https://<service-url>/health`, one chat request, and confirm the frontend's backend URL points at the new service.
