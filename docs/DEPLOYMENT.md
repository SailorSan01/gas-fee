# Deployment Guide

This guide covers deploying the Gas-Fee Sponsor Relayer Bot system in various environments, from local development to production.

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 50GB SSD
- Network: 100 Mbps

**Recommended for Production:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 200GB+ SSD
- Network: 1 Gbps

### Software Dependencies

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 16+ (for development)
- PostgreSQL 13+
- Redis 6+

## Local Development

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd gas-fee-sponsor-relayer-bot

# Run setup script
./scripts/setup.sh

# Start services
docker-compose up -d

# Deploy contracts to local network
cd contracts
npx hardhat run scripts/deploy.js --network localhost

# Verify setup
curl http://localhost:3000/health
```

### Manual Setup

```bash
# Install dependencies
cd contracts && npm install
cd ../relayer-backend && npm install
cd ../cli-tools && npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure services
docker-compose up -d postgres redis

# Run database migrations
cd relayer-backend
npm run migrate

# Start Hardhat local network
cd ../contracts
npx hardhat node &

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Start relayer backend
cd ../relayer-backend
npm run dev
```

## Staging Environment

### Infrastructure Setup

```bash
# Create staging environment
mkdir staging-deployment
cd staging-deployment

# Copy configuration files
cp ../docker-compose.yml .
cp ../docker-compose.staging.yml .

# Configure environment
cp ../.env.example .env.staging
# Edit .env.staging with staging configuration
```

### Environment Configuration

```bash
# .env.staging
NODE_ENV=staging
LOG_LEVEL=info

# Database
DB_HOST=staging-db.internal
DB_NAME=relayer_staging
DB_USER=relayer_user
DB_PASSWORD=secure_staging_password

# Redis
REDIS_HOST=staging-redis.internal
REDIS_PASSWORD=redis_staging_password

# Networks
ETHEREUM_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com/

# Relayer
RELAYER_PRIVATE_KEY=0x...
MAX_TX_PER_HOUR=500
MAX_VALUE_PER_TX=10000000000000000000  # 10 ETH
```

### Deployment

```bash
# Deploy with staging profile
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Deploy contracts to testnets
cd contracts
npx hardhat run scripts/deploy.js --network goerli
npx hardhat run scripts/deploy.js --network bscTestnet
npx hardhat run scripts/deploy.js --network polygonMumbai

# Verify contracts
npx hardhat verify --network goerli DEPLOYED_ADDRESS

# Run integration tests
npm run test:integration
```

## Production Deployment

### Infrastructure Planning

#### Architecture Overview

```
Internet → Load Balancer → Application Servers → Database Cluster
                      ↓
                  Monitoring Stack
```

#### Component Distribution

**Application Tier:**
- 2+ Relayer Backend instances (for redundancy)
- Load balancer (nginx/HAProxy)
- SSL termination

**Data Tier:**
- PostgreSQL cluster (primary + replica)
- Redis cluster
- Backup storage

**Monitoring Tier:**
- Prometheus
- Grafana
- AlertManager

### Production Configuration

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn

# Security
API_RATE_LIMIT=1000
ENABLE_CORS=false
TRUSTED_PROXIES=10.0.0.0/8

# Database - Primary
DB_HOST=prod-db-primary.internal
DB_NAME=relayer_production
DB_USER=relayer_prod
DB_PASSWORD=ultra_secure_password
DB_SSL=true
DB_MAX_CONNECTIONS=50

# Database - Read Replica
DB_REPLICA_HOST=prod-db-replica.internal

# Redis Cluster
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379
REDIS_PASSWORD=redis_production_password

# Networks - Mainnet
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/

# Relayer Configuration
RELAYER_PRIVATE_KEY=0x...  # Use KMS in production
SIGNER_TYPE=kms
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/...

# Limits
MAX_TX_PER_HOUR=10000
MAX_VALUE_PER_TX=100000000000000000000  # 100 ETH
MAX_GAS_PRICE=200000000000  # 200 gwei

# Monitoring
PROMETHEUS_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080
```

### AWS Deployment

#### Using ECS (Elastic Container Service)

```yaml
# ecs-task-definition.json
{
  "family": "relayer-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/relayerTaskRole",
  "containerDefinitions": [
    {
      "name": "relayer-backend",
      "image": "your-registry/relayer-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:relayer/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/relayer-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Infrastructure as Code (Terraform)

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "relayer-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
}

# RDS PostgreSQL
resource "aws_db_instance" "relayer_db" {
  identifier = "relayer-production"
  
  engine         = "postgres"
  engine_version = "13.7"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "relayer_production"
  username = "relayer_prod"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.relayer.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "relayer-final-snapshot"
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "relayer_redis" {
  replication_group_id       = "relayer-redis"
  description                = "Redis cluster for relayer"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis6.x"
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.relayer.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_password
}

# ECS Cluster
resource "aws_ecs_cluster" "relayer" {
  name = "relayer-cluster"
  
  capacity_providers = ["FARGATE"]
  
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
  }
}

# Application Load Balancer
resource "aws_lb" "relayer" {
  name               = "relayer-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = true
}
```

### Kubernetes Deployment

#### Namespace and ConfigMap

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: relayer-system

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: relayer-config
  namespace: relayer-system
data:
  NODE_ENV: "production"
  LOG_LEVEL: "warn"
  PROMETHEUS_ENABLED: "true"
  METRICS_PORT: "9090"
```

#### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: relayer-secrets
  namespace: relayer-system
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  RELAYER_PRIVATE_KEY: <base64-encoded-key>
```

#### Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: relayer-backend
  namespace: relayer-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: relayer-backend
  template:
    metadata:
      labels:
        app: relayer-backend
    spec:
      containers:
      - name: relayer-backend
        image: your-registry/relayer-backend:latest
        ports:
        - containerPort: 3000
        - containerPort: 9090
        envFrom:
        - configMapRef:
            name: relayer-config
        - secretRef:
            name: relayer-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

#### Service and Ingress

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: relayer-backend-service
  namespace: relayer-system
spec:
  selector:
    app: relayer-backend
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: relayer-ingress
  namespace: relayer-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "1000"
spec:
  tls:
  - hosts:
    - api.relayer.example.com
    secretName: relayer-tls
  rules:
  - host: api.relayer.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: relayer-backend-service
            port:
              number: 80
```

### Database Setup

#### Production Database Configuration

```sql
-- Create database and user
CREATE DATABASE relayer_production;
CREATE USER relayer_prod WITH ENCRYPTED PASSWORD 'ultra_secure_password';
GRANT ALL PRIVILEGES ON DATABASE relayer_production TO relayer_prod;

-- Connect to the database
\c relayer_production;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create tables (run migrations)
-- Tables will be created by the application migrations

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_transactions_created_at ON transactions(created_at);
CREATE INDEX CONCURRENTLY idx_transactions_from_address ON transactions(from_address);
CREATE INDEX CONCURRENTLY idx_transactions_network_status ON transactions(network, status);
CREATE INDEX CONCURRENTLY idx_policy_rules_type_target ON policy_rules(rule_type, target);

-- Setup read replica user
CREATE USER relayer_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE relayer_production TO relayer_readonly;
GRANT USAGE ON SCHEMA public TO relayer_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO relayer_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO relayer_readonly;
```

#### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="relayer_production"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/relayer_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/relayer_$DATE.sql.gz s3://relayer-backups/database/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "relayer_*.sql.gz" -mtime +30 -delete

# Verify backup integrity
gunzip -t $BACKUP_DIR/relayer_$DATE.sql.gz
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: relayer_$DATE.sql.gz"
else
    echo "Backup verification failed!" >&2
    exit 1
fi
```

### Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "relayer_rules.yml"

scrape_configs:
  - job_name: 'relayer-backend'
    static_configs:
      - targets: ['relayer-backend:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Relayer System Overview",
    "panels": [
      {
        "title": "Transaction Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(relayer_transactions_total[5m])",
            "legendFormat": "Transactions/sec"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(relayer_transactions_successful[5m]) / rate(relayer_transactions_total[5m]) * 100",
            "legendFormat": "Success Rate %"
          }
        ]
      }
    ]
  }
}
```

### Security Hardening

#### SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.relayer.example.com;
    
    ssl_certificate /etc/ssl/certs/relayer.crt;
    ssl_certificate_key /etc/ssl/private/relayer.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    location / {
        proxy_pass http://relayer-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Firewall Rules

```bash
# UFW firewall rules
ufw default deny incoming
ufw default allow outgoing

# SSH access
ufw allow from 10.0.0.0/8 to any port 22

# HTTP/HTTPS
ufw allow 80
ufw allow 443

# Database (internal only)
ufw allow from 10.0.0.0/8 to any port 5432

# Redis (internal only)
ufw allow from 10.0.0.0/8 to any port 6379

# Monitoring
ufw allow from 10.0.0.0/8 to any port 9090

ufw enable
```

### Deployment Checklist

#### Pre-Deployment

- [ ] Infrastructure provisioned and configured
- [ ] SSL certificates installed and validated
- [ ] Database cluster setup with backups
- [ ] Redis cluster configured
- [ ] Monitoring stack deployed
- [ ] Security groups and firewall rules configured
- [ ] DNS records configured
- [ ] Load balancer health checks configured

#### Deployment

- [ ] Application images built and pushed to registry
- [ ] Environment variables and secrets configured
- [ ] Database migrations executed
- [ ] Smart contracts deployed and verified
- [ ] Application deployed with rolling update
- [ ] Health checks passing
- [ ] Smoke tests executed

#### Post-Deployment

- [ ] Monitoring dashboards configured
- [ ] Alerting rules activated
- [ ] Log aggregation working
- [ ] Backup procedures tested
- [ ] Disaster recovery plan documented
- [ ] Performance benchmarks established
- [ ] Security scan completed
- [ ] Documentation updated

### Rollback Procedures

#### Application Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/relayer-backend -n relayer-system

# ECS rollback
aws ecs update-service --cluster relayer-cluster --service relayer-backend --task-definition relayer-backend:PREVIOUS_REVISION

# Docker Compose rollback
docker-compose pull
docker-compose up -d --force-recreate
```

#### Database Rollback

```bash
# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME backup.sql

# Run down migrations if needed
npm run migrate:down
```

This deployment guide provides comprehensive instructions for deploying the Gas-Fee Sponsor Relayer Bot system across different environments and platforms.

