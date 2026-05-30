# AWS Setup Guide — Step-by-Step

This guide walks you through deploying the portfolio backend to AWS from scratch.
Estimated time: 2–3 hours on first run.

---

## Prerequisites

```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Docker
sudo apt-get install docker.io -y
sudo usermod -aG docker $USER   # log out and back in

# Verify
aws --version        # aws-cli/2.x
docker --version     # Docker 24+
python3 --version    # 3.12
```

---

## Step 1 — Configure AWS CLI

```bash
aws configure
# AWS Access Key ID:     <from IAM console>
# AWS Secret Access Key: <from IAM console>
# Default region name:   us-east-1
# Default output format: json
```

> Create the access key at: **IAM → Users → your-user → Security credentials → Create access key**  
> Attach policy `AdministratorAccess` for initial setup; scope it down after.

---

## Step 2 — Create ECR Repository

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export ECR_REPO=portfolio-backend

aws ecr create-repository \
  --repository-name $ECR_REPO \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION

# Output: repositoryUri → save this
export ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
echo "ECR URI: $ECR_URI"
```

---

## Step 3 — Build and Push Docker Image

```bash
cd /path/to/3d_portafolio/backend

# Authenticate Docker to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build image
docker build -t portfolio-backend .

# Tag and push
docker tag portfolio-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest

echo "Image pushed: $ECR_URI:latest"
```

---

## Step 4 — Create RDS PostgreSQL Database

### 4a. Create a DB subnet group (use default VPC)

```bash
# Get default VPC subnets
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=defaultForAz,Values=true" \
  --query "Subnets[*].SubnetId" \
  --output text | tr '\t' ',')

aws rds create-db-subnet-group \
  --db-subnet-group-name portfolio-db-subnet \
  --db-subnet-group-description "Portfolio DB subnets" \
  --subnet-ids $(echo $SUBNET_IDS | tr ',' ' ')
```

### 4b. Create security group for RDS

```bash
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text)

SG_ID=$(aws ec2 create-security-group \
  --group-name portfolio-rds-sg \
  --description "Portfolio RDS PostgreSQL" \
  --vpc-id $VPC_ID \
  --query GroupId --output text)

# Allow PostgreSQL from App Runner VPC connector (add later — placeholder for 0.0.0.0/0 in dev)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0    # tighten this after App Runner VPC connector is set up

echo "RDS SG: $SG_ID"
```

### 4c. Create the RDS instance

```bash
DB_PASSWORD=$(openssl rand -base64 32)
echo "DB Password (save this!): $DB_PASSWORD"

aws rds create-db-instance \
  --db-instance-identifier portfolio-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.3 \
  --master-username portfolioadmin \
  --master-user-password "$DB_PASSWORD" \
  --db-name portfoliodb \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $SG_ID \
  --db-subnet-group-name portfolio-db-subnet \
  --backup-retention-period 7 \
  --no-multi-az \
  --publicly-accessible \
  --no-deletion-protection

# Wait ~5 minutes for it to be available
aws rds wait db-instance-available --db-instance-identifier portfolio-postgres
echo "RDS is ready."

# Get the endpoint
DB_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier portfolio-postgres \
  --query "DBInstances[0].Endpoint.Address" --output text)
echo "DB Host: $DB_HOST"

export DATABASE_URL="postgresql+asyncpg://portfolioadmin:${DB_PASSWORD}@${DB_HOST}:5432/portfoliodb"
```

---

## Step 5 — Create S3 Bucket for RAG Documents

```bash
BUCKET_NAME="diegojpc-rag-docs-${AWS_ACCOUNT_ID}"

aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

# Block all public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Upload RAG documents from local data/ folder
aws s3 sync backend/data/ s3://$BUCKET_NAME/ \
  --exclude "*.pyc" --exclude "__pycache__/*"

echo "Documents uploaded to s3://$BUCKET_NAME/"
echo "S3_BUCKET=$BUCKET_NAME"
```

---

## Step 6 — Store Secrets in Secrets Manager

```bash
APP_SECRET=$(openssl rand -hex 32)

aws secretsmanager create-secret \
  --name portfolio/prod/gemini-api-key \
  --secret-string "$GEMINI_API_KEY"

aws secretsmanager create-secret \
  --name portfolio/prod/database-url \
  --secret-string "$DATABASE_URL"

aws secretsmanager create-secret \
  --name portfolio/prod/app-secret \
  --secret-string "$APP_SECRET"

echo "Secrets created in Secrets Manager."
```

> To update a secret later:  
> `aws secretsmanager put-secret-value --secret-id portfolio/prod/gemini-api-key --secret-string "new_key"`

---

## Step 7 — Create IAM Role for App Runner

### 7a. Create the role

```bash
cat > /tmp/apprunner-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
  --role-name portfolio-apprunner-task-role \
  --assume-role-policy-document file:///tmp/apprunner-trust-policy.json \
  --query Role.Arn --output text)

echo "Role ARN: $ROLE_ARN"
```

### 7b. Attach minimum permissions

```bash
cat > /tmp/portfolio-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:portfolio/prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}",
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:/aws/apprunner/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name portfolio-apprunner-task-role \
  --policy-name portfolio-permissions \
  --policy-document file:///tmp/portfolio-policy.json
```

### 7c. Access role (for ECR pull)

```bash
ACCESS_ROLE_ARN=$(aws iam create-role \
  --role-name portfolio-apprunner-access-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"build.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  --query Role.Arn --output text)

aws iam attach-role-policy \
  --role-name portfolio-apprunner-access-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
```

---

## Step 8 — Run Database Migrations

```bash
cd backend

# Create .env for migration (local run against RDS)
cat > .env.migration << EOF
DATABASE_URL=${DATABASE_URL}
APP_SECRET=${APP_SECRET}
GEMINI_API_KEY=placeholder
CORS_ORIGINS=http://localhost:5173
EOF

# Run Alembic migrations
source .venv/bin/activate
DATABASE_URL=$DATABASE_URL alembic upgrade head

echo "Migrations applied."
```

---

## Step 9 — Deploy to App Runner

```bash
cat > /tmp/apprunner-config.json << EOF
{
  "ServiceName": "portfolio-backend",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "${ECR_URI}:latest",
      "ImageConfiguration": {
        "Port": "8000",
        "RuntimeEnvironmentVariables": {
          "CORS_ORIGINS": "https://diegojpc.com,https://www.diegojpc.com",
          "MODEL_NAME": "gemini-1.5-flash",
          "EMBEDDING_MODEL": "models/text-embedding-004",
          "ENABLE_DOCS": "false",
          "S3_BUCKET": "${BUCKET_NAME}",
          "AWS_DEFAULT_REGION": "${AWS_REGION}",
          "GEMINI_API_KEY_SECRET": "portfolio/prod/gemini-api-key",
          "DATABASE_URL_SECRET": "portfolio/prod/database-url",
          "APP_SECRET_SECRET": "portfolio/prod/app-secret"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "${ACCESS_ROLE_ARN}"
    }
  },
  "InstanceConfiguration": {
    "Cpu": "0.5 vCPU",
    "Memory": "1 GB",
    "InstanceRoleArn": "${ROLE_ARN}"
  },
  "AutoScalingConfigurationArn": null,
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 2,
    "UnhealthyThreshold": 3
  },
  "ObservabilityConfiguration": {
    "ObservabilityEnabled": true
  }
}
EOF

SERVICE_ARN=$(aws apprunner create-service \
  --cli-input-json file:///tmp/apprunner-config.json \
  --query Service.ServiceArn --output text)

echo "App Runner service ARN: $SERVICE_ARN"

# Wait for it to be running (3–5 minutes)
aws apprunner wait service-running --service-arn $SERVICE_ARN

SERVICE_URL=$(aws apprunner describe-service \
  --service-arn $SERVICE_ARN \
  --query Service.ServiceUrl --output text)

echo "Service URL: https://$SERVICE_URL"
curl "https://$SERVICE_URL/health"
```

---

## Step 10 — Configure CloudFront

```bash
# Create distribution pointing to App Runner for /api/* and Hostinger for everything else
# (Simplified — use the AWS Console for the first time; it's easier than the CLI for multi-origin)
```

**Console steps:**
1. Go to **CloudFront → Create distribution**
2. **Origin 1**: `your-service.us-east-1.awsapprunner.com` — Origin path: empty
3. **Origin 2**: Your Hostinger domain (e.g., `diegojpc.hostingersite.com`)
4. **Default behavior**: Forward to Hostinger origin (static frontend)
5. **Add behavior** for `/api/*`: Forward to App Runner origin
   - Cache policy: **CachingDisabled**
   - Origin request policy: **AllViewer**
   - Allowed methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
6. **Alternate domain names (CNAMEs)**: `diegojpc.com`, `www.diegojpc.com`
7. **SSL certificate**: Select the ACM cert for `*.diegojpc.com`

Then update your frontend `.env`:
```env
VITE_API_URL=https://diegojpc.com/api
```

---

## Step 11 — Point DNS to CloudFront

In Hostinger DNS panel (or Route 53 if migrated):
```
Type    Name    Value
CNAME   www     <cloudfront-id>.cloudfront.net
ALIAS   @       <cloudfront-id>.cloudfront.net
```

---

## Step 12 — Set Up CloudWatch Alarm (Billing)

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name portfolio-billing-alert \
  --alarm-description "Alert when estimated charges exceed $30" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 30 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:${AWS_ACCOUNT_ID}:billing-alerts
```

---

## Redeploy (After Code Changes)

```bash
# From project root
cd backend
docker build -t portfolio-backend .
docker tag portfolio-backend:latest $ECR_URI:latest
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
docker push $ECR_URI:latest
# App Runner detects the new image and redeploys automatically (~60 s)
```

Or add a `Makefile`:
```makefile
deploy:
	docker build -t portfolio-backend ./backend
	docker tag portfolio-backend:latest $(ECR_URI):latest
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ENDPOINT)
	docker push $(ECR_URI):latest
```

---

## Rollback

```bash
# List available images
aws ecr list-images --repository-name portfolio-backend

# Redeploy with a previous image tag
aws apprunner update-service \
  --service-arn $SERVICE_ARN \
  --source-configuration '{"ImageRepository":{"ImageIdentifier":"'$ECR_URI':previous-tag","ImageRepositoryType":"ECR"}}'
```

---

## Tear Down (Nuclear Option)

```bash
aws apprunner delete-service --service-arn $SERVICE_ARN
aws rds delete-db-instance --db-instance-identifier portfolio-postgres --skip-final-snapshot
aws s3 rb s3://$BUCKET_NAME --force
aws ecr delete-repository --repository-name portfolio-backend --force
aws secretsmanager delete-secret --secret-id portfolio/prod/gemini-api-key --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id portfolio/prod/database-url --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id portfolio/prod/app-secret --force-delete-without-recovery
```
