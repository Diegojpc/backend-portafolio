# AWS Cost Estimate

Pricing as of June 2026 — `us-east-1` region. All figures in USD.

---

## Recommended Stack: App Runner + RDS PostgreSQL

### Monthly Breakdown

| Service | Configuration | Est. Monthly |
|---|---|---|
| **App Runner** | 0.5 vCPU · 1 GB RAM · scale-to-zero | $3 – $8 |
| **RDS PostgreSQL** | db.t3.micro · Single-AZ · 20 GB gp3 | $13.00 |
| **S3** | RAG docs bucket · ~50 MB · < 1K req/day | $0.50 |
| **ECR** | 1 image · < 500 MB | $0.00 ¹ |
| **CloudFront** | < 1 TB out · < 10 M requests | $0.00 ¹ |
| **ACM** | Wildcard cert for CloudFront | $0.00 |
| **Secrets Manager** | 3 secrets | $1.20 |
| **CloudWatch Logs** | < 5 GB/month | $0.00 ¹ |
| **Route 53** | 1 hosted zone | $0.50 |
| **Data transfer** | < 1 GB out (App Runner → internet) | $0.09 |
| **TOTAL** | | **$18 – $23 /mo** |

¹ Within AWS Free Tier perpetual limits.

**Annual estimate: $216 – $276**

---

## Budget Alternative: App Runner + Neon (free PostgreSQL)

If you want to minimize cost and are OK with an external managed DB:

| Service | Configuration | Est. Monthly |
|---|---|---|
| **App Runner** | 0.5 vCPU · 1 GB RAM · scale-to-zero | $3 – $8 |
| **Neon PostgreSQL** | Free tier · 0.5 GB storage · 1 project | $0.00 |
| **S3 + Secrets + Route 53** | Same as above | $2.29 |
| **TOTAL** | | **$5 – $10 /mo** |

**Annual estimate: $60 – $120**

> Neon free tier limitations: 0.5 GB storage, 1 project, compute suspends after 5 min inactivity (cold start ~1 s).  
> Suitable while daily active users < 100 and message volume < 10 K/month.

---

## App Runner Cost Drill-Down

App Runner pricing has two components:

| Component | Active rate | Idle/paused rate |
|---|---|---|
| vCPU | $0.064 / vCPU·hr | $0.007 / vCPU·hr |
| Memory | $0.007 / GB·hr | $0.0008 / GB·hr |

**Scale-to-zero scenario** (minimum instances = 0, portfolio traffic ~1 h active/day):
- Active hours/month: 30 h
- Compute: ($0.064 × 0.5 × 30) + ($0.007 × 1 × 30) = $0.96 + $0.21 = **$1.17**
- Cold start: ~15–25 s after a period of inactivity

**Always-on scenario** (minimum instances = 1, no cold starts):
- vCPU: $0.064 × 0.5 × 720 = $23.04
- Memory: $0.007 × 1 × 720 = $5.04
- Total compute: **$28/mo** (add RDS = ~$41/mo = ~$492/yr)

**Recommendation:** use scale-to-zero (min=0). The portfolio chatbot has bursty, occasional traffic — a 20 s first-request warm-up is invisible to most visitors and saves ~$25/mo.

---

## RDS Cost Drill-Down

| Line item | Cost |
|---|---|
| db.t3.micro instance (730 h × $0.018/hr) | $13.14 |
| 20 GB gp3 storage ($0.115/GB) | $2.30 |
| Automated backups (7 days, same-region) | $0.00 ¹ |
| Data transfer in | $0.00 |
| **Monthly total** | **$15.44** |

¹ Backup storage up to the DB storage size is free.

**Reserved Instance pricing (1-year, no upfront):** saves ~30% → ~$10.80/mo

---

## Comparison vs Alternatives

| Option | Monthly | Annual | Notes |
|---|---|---|---|
| **AWS App Runner + RDS** | $18–23 | $216–276 | Recommended — fully AWS-native |
| **AWS App Runner + Neon** | $5–10 | $60–120 | Best cost, external DB dependency |
| **AWS Lightsail (container) + Neon** | $7–14 | $84–168 | Simpler, less auto-scaling capability |
| **AWS EC2 t4g.small + RDS** | $25–35 | $300–420 | More control, more ops overhead |
| **Render free** | $0 | $0 | Current — ephemeral DB, no persistence |
| **Render paid ($7/mo) + Supabase free** | $7 | $84 | Easiest migration, not AWS |

---

## One-Time Setup Costs

| Item | Est. Cost |
|---|---|
| Route 53 domain transfer (if moving from Hostinger) | $0 — keep Hostinger DNS |
| ECR first image push | $0 |
| RDS snapshot after first migration | $0 |
| **Total** | **$0** |

---

## Cost Optimization Tips

1. **Use Reserved Instance for RDS** — 1-year no-upfront commitment saves 30% on the biggest line item
2. **Enable App Runner scale-to-zero** — biggest single lever for a low-traffic portfolio
3. **Set CloudWatch log retention to 30 days** — prevents log storage costs from accumulating silently
4. **Enable S3 Intelligent-Tiering** — irrelevant at 50 MB but good hygiene
5. **Set a CloudWatch billing alarm** — alert at $30/mo so surprises don't happen
