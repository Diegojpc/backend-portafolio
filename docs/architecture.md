# AWS Architecture — Portfolio AI Backend

## Overview

This document describes the production AWS architecture for Diego's portfolio AI chatbot backend.
The system replaces the ephemeral Render/SQLite setup with a persistent, containerized stack on AWS.

---

## Architecture Diagram

```mermaid
graph TB
    USER([🌐 Visitor Browser\ndiegojpc.com])

    subgraph HOSTINGER["Hostinger (existing)"]
        STATIC[Static Frontend\nReact + Vite SPA]
    end

    subgraph AWS["☁️  AWS — us-east-1"]

        subgraph CDN_LAYER["Content Delivery"]
            CF[CloudFront\nDistribution]
            ACM[ACM\nSSL/TLS Certificate]
        end

        subgraph COMPUTE["Compute"]
            AR[App Runner\nFastAPI Container\n0.5 vCPU · 1 GB RAM]
            ECR[ECR\nContainer Registry]
        end

        subgraph DATA["Data"]
            RDS[(RDS PostgreSQL\nt3.micro · Single-AZ)]
            S3_DOCS[S3 Bucket\nRAG Documents\nCVs · PDFs · MDs]
        end

        subgraph SECRETS["Configuration & Secrets"]
            SM[Secrets Manager\nGEMINI_API_KEY\nDATABASE_URL\nAPP_SECRET]
        end

        subgraph OBS["Observability"]
            CWL[CloudWatch Logs\nApp logs stream]
            CWA[CloudWatch Alarms\nError rate · Latency]
        end

        subgraph IAM_LAYER["Identity"]
            IAM[IAM Role\nApp Runner Task Role]
        end
    end

    subgraph EXTERNAL["External SaaS"]
        GEMINI[Google Gemini API\n1.5 Flash · Streaming]
    end

    USER -->|HTTPS requests| CF
    CF -->|/api/** → origin| AR
    CF -->|Static assets| STATIC
    ACM -.->|Wildcard cert| CF

    AR -->|docker pull| ECR
    AR -->|GetSecretValue| SM
    AR -->|asyncpg TCP 5432| RDS
    AR -->|GetObject| S3_DOCS
    AR -->|SSE stream| GEMINI
    AR -->|PutLogEvents| CWL

    IAM -->|AssumeRole| AR
    CWL -->|metric filters| CWA
```

---

## Component Breakdown

### CloudFront Distribution
- Single entry point for all traffic (`diegojpc.com` and `api.diegojpc.com`)
- Routes `/api/*` to App Runner origin; all other paths hit Hostinger static hosting
- Terminates SSL/TLS via ACM wildcard cert (`*.diegojpc.com`)
- Free tier covers the traffic volume of a portfolio site (1 TB out / 10 M requests/month)

### App Runner
- Pulls the Docker image from ECR on every deploy; no SSH required
- Scales to zero automatically when idle — eliminates idle compute cost
- Cold-start penalty: ~15–25 s after inactivity. Acceptable for a portfolio
- SSE streaming works natively (unlike Lambda + API Gateway which impose a 29 s timeout)
- Env vars injected from Secrets Manager at container start via the task IAM role
- Observability: stdout/stderr automatically forwarded to CloudWatch Logs

### ECR (Elastic Container Registry)
- Private Docker registry; 500 MB free storage, then $0.10/GB
- `portfolio-backend:latest` tag updated on each `docker push`; App Runner re-deploys automatically when image changes

### RDS PostgreSQL (t3.micro, Single-AZ)
- Replaces Render's ephemeral SQLite — conversations persist across restarts, redeploys, and sleep cycles
- Automated daily snapshots, 7-day retention (included in price)
- Private subnet — App Runner connects via VPC connector over private IP; not internet-exposed
- Schema managed by Alembic; zero `create_all()` calls in application code

### S3 — RAG Documents Bucket
- Stores `data/*.pdf`, `data/*.md`, `data/*.txt` that power the Mega-Prompt knowledge base
- App Runner loads documents from S3 on startup (falls back to local `data/` if `S3_BUCKET` is not set)
- Uploading a new CV: `aws s3 cp new_cv.pdf s3://diegojpc-rag-docs/` then redeploy App Runner

### Secrets Manager
- Three secrets: `GEMINI_API_KEY`, `DATABASE_URL`, `APP_SECRET`
- Rotatable and auditable (CloudTrail)
- Cost: $0.40/secret/month = $1.20/mo total

### IAM Role (App Runner Task Role)
- Minimum permissions:
  - `secretsmanager:GetSecretValue` on the three portfolio secrets
  - `s3:GetObject`, `s3:ListBucket` on the RAG docs bucket
  - `logs:PutLogEvents`, `logs:CreateLogStream` on the app log group
- No wildcard `*` permissions anywhere

### CloudWatch
- Log group: `/aws/apprunner/portfolio-backend`
- Alarm: `5xxErrorRate > 5%` for 5 minutes → SNS email alert
- Free tier: 5 GB log ingestion, 3 dashboards

---

## Data Flow — Chat Request

```mermaid
sequenceDiagram
    actor Visitor
    participant CF as CloudFront
    participant AR as App Runner (FastAPI)
    participant PG as RDS PostgreSQL
    participant SM as Secrets Manager
    participant S3 as S3 Docs
    participant GEM as Gemini API

    Note over AR,SM: Cold start (if scaled to zero)
    AR->>SM: GetSecretValue(GEMINI_API_KEY, DATABASE_URL)
    AR->>S3: GetObject(*.pdf, *.md) → build Mega-Prompt
    AR->>AR: _state["is_ready"] = True

    Visitor->>CF: POST /api/conversations/1/chat {prompt}
    CF->>AR: Forward request
    AR->>PG: SELECT last 10 messages (history)
    AR->>GEM: stream_message(prompt, history, system=mega_prompt)
    loop SSE chunks
        GEM-->>AR: chunk
        AR-->>CF: text/event-stream chunk
        CF-->>Visitor: chunk (streaming)
    end
    AR->>PG: INSERT message (prompt + full response)
    AR->>PG: UPDATE conversation title (first message)
```

---

## Database Schema

```mermaid
erDiagram
    conversations {
        int id PK
        varchar title
        timestamptz created_at
        timestamptz updated_at
    }
    messages {
        int id PK
        int conversation_id FK
        text prompt_content
        text response_content
        timestamptz created_at
    }
    contact_submissions {
        int id PK
        varchar name
        varchar email
        text message
        timestamptz submitted_at
        bool is_read
    }

    conversations ||--o{ messages : "has"
```

---

## Deployment Pipeline (Manual → CI/CD path)

```mermaid
flowchart LR
    DEV[Local dev\ngit push] --> GH[GitHub repo]
    GH -->|GitHub Actions\n.github/workflows/deploy.yml| BUILD
    subgraph BUILD["Build stage"]
        B1[docker build] --> B2[docker push ECR]
    end
    BUILD --> AR2[App Runner\nauto-redeploy\non new image]
    AR2 --> LIVE[🌐 Live in ~60 s]
```

> **Phase 1 (now):** manual `make deploy` from local machine.  
> **Phase 2:** add GitHub Actions workflow — push to `main` → auto-deploy.

---

## Security Notes

| Layer | Control |
|---|---|
| Network | RDS in private subnet; no public endpoint |
| Secrets | All credentials in Secrets Manager; none in environment variables in plain text |
| CORS | Strict origin allowlist (`diegojpc.com` only) |
| Rate limiting | `slowapi` on `/conversations/{id}/chat` — 10 req/min per IP |
| Auth | Stateless `APP_SECRET` HMAC check on write endpoints (future) |
| Container | Non-root user in Dockerfile; read-only root filesystem |
