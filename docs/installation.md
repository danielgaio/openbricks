# OpenBricks Installation Guide

This guide covers various installation methods for OpenBricks.

## Prerequisites

Before installing OpenBricks, ensure you have:

- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: 20GB free space minimum
- **Network**: Ports 3000, 8000, 8080, 8888, 9000, 9001 available

## Quick Start (Local Installation)

### 1. Clone the Repository

```bash
git clone https://github.com/danielgaio/openbricks.git
cd openbricks
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Start OpenBricks

```bash
docker compose up -d
```

### 4. Verify Installation

```bash
docker compose ps
```

All services should show as "running".

## Manual Installation

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Edit .env
nano .env
```

Key settings to configure:
- `JWT_SECRET`: A secure random string for authentication
- `POSTGRES_PASSWORD`: Database password
- `MINIO_ROOT_PASSWORD`: Object storage password

### 2. Build Custom Services

```bash
docker compose build
```

### 3. Start Services

```bash
docker compose up -d
```

## Cloud Deployment

### AWS Deployment

```bash
# Configure AWS credentials
aws configure

# Deploy using CloudFormation (coming soon)
./scripts/deploy-aws.sh
```

### Google Cloud Deployment

```bash
# Configure GCP credentials
gcloud auth login

# Deploy using Terraform (coming soon)
./scripts/deploy-gcp.sh
```

### Azure Deployment

```bash
# Configure Azure credentials
az login

# Deploy using ARM templates (coming soon)
./scripts/deploy-azure.sh
```

## Kubernetes Deployment

### Using Helm (Coming Soon)

```bash
helm repo add openbricks https://charts.openbricks.io
helm install openbricks openbricks/openbricks
```

### Using kubectl

```bash
kubectl apply -f k8s/
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENBRICKS_PORT` | Main API port | 8080 |
| `POSTGRES_USER` | Database username | openbricks |
| `POSTGRES_PASSWORD` | Database password | openbricks |
| `MINIO_ROOT_USER` | MinIO username | openbricks |
| `MINIO_ROOT_PASSWORD` | MinIO password | openbricks123 |
| `JWT_SECRET` | JWT signing key | (required) |
| `SPARK_DRIVER_MEMORY` | Spark driver memory | 2g |
| `SPARK_EXECUTOR_MEMORY` | Spark executor memory | 2g |

### Scaling

To add more Spark workers:

```yaml
# docker-compose.yml
spark-worker:
  deploy:
    replicas: 3
```

### SSL/TLS

For production, configure SSL:

1. Obtain SSL certificates
2. Mount certificates to Traefik
3. Update Traefik configuration

## Troubleshooting

### Services Not Starting

```bash
# Check service logs
docker compose logs api
docker compose logs postgres

# Restart services
docker compose restart
```

### Database Connection Issues

```bash
# Check PostgreSQL status
docker compose exec postgres pg_isready

# Reset database
docker compose down -v
docker compose up -d
```

### Memory Issues

Increase Docker memory allocation or reduce service memory in `.env`:

```bash
SPARK_DRIVER_MEMORY=1g
SPARK_EXECUTOR_MEMORY=1g
```

## Upgrading

### From Previous Version

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker compose build

# Restart with new images
docker compose down
docker compose up -d
```

### Database Migrations

Migrations run automatically on startup. For manual migration:

```bash
docker compose exec api npm run migrate
```

## Uninstalling

### Complete Removal

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove images
docker compose down --rmi all
```

### Keep Data

```bash
# Stop containers only
docker compose down
```
