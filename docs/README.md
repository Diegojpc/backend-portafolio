# Portfolio Backend — Documentation

## Documents

| File | Description |
|---|---|
| [architecture.md](architecture.md) | Full AWS architecture with Mermaid diagrams, component breakdown, data-flow, and security notes |
| [aws-setup-guide.md](aws-setup-guide.md) | Step-by-step CLI instructions to deploy the backend to AWS from scratch |
| [cost-estimate.md](cost-estimate.md) | Monthly and annual AWS cost breakdown with optimization tips |

---

## Quick Summary

### What was changed to support AWS deployment

| File | Change |
|---|---|
| `backend/Dockerfile` | Added — containerizes FastAPI for App Runner |
| `backend/.dockerignore` | Added — excludes venv, .env, storage from image |
| `backend/requirements.txt` | Added `asyncpg`, `alembic`, `psycopg2-binary`, `slowapi`, `boto3`, `email-validator` |
| `backend/app/entities.py` | Added `ContactSubmission` entity |
| `backend/app/schemas.py` | Added `ContactCreate` / `ContactOut` schemas |
| `backend/app/routers/contact.py` | Added `POST /contact` endpoint with 5/min rate limit |
| `backend/app/routers/conversations.py` | Added `slowapi` 10/min rate limit on `/chat` |
| `backend/app/main.py` | Wired `slowapi` limiter + registered contact router |
| `backend/app/config.py` | Added `S3_BUCKET` optional env var |
| `backend/app/services/rag.py` | Added S3 document loading (with local `data/` fallback) |
| `backend/alembic/` | Alembic migration setup + initial schema migration |

### Environment variables for AWS

```env
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@rds-host:5432/portfoliodb
GEMINI_API_KEY=<your key>
APP_SECRET=<32+ char random string>
CORS_ORIGINS=https://diegojpc.com,https://www.diegojpc.com

# Optional (AWS-specific)
S3_BUCKET=diegojpc-rag-docs-<account-id>   # load RAG docs from S3 instead of local data/
ENABLE_DOCS=false
MODEL_NAME=gemini-1.5-flash
EMBEDDING_MODEL=models/text-embedding-004
```

### Run migrations

```bash
# Against RDS (PostgreSQL)
DATABASE_URL="postgresql+asyncpg://user:pass@host/db" alembic upgrade head

# Against local SQLite (dev)
DATABASE_URL="sqlite+aiosqlite:////tmp/portfolio_dev.db" alembic upgrade head
```

### Deploy

```bash
# Build + push to ECR → App Runner auto-redeploys
docker build -t portfolio-backend ./backend
docker tag portfolio-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

See [aws-setup-guide.md](aws-setup-guide.md) for the full walk-through.
