# OpenBricks Quick Start Guide

Get OpenBricks running locally in under 5 minutes.

## Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Git**
- At least **8GB RAM** and **20GB disk space**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/danielgaio/openbricks.git
cd openbricks
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Generate secure secrets (recommended for non-dev environments)
# macOS/Linux:
openssl rand -base64 32  # Use output for JWT_SECRET
openssl rand -base64 32  # Use output for NEXTAUTH_SECRET
```

### 3. Start All Services

```bash
# Using Make (recommended)
make up

# Or using docker-compose directly
docker-compose up -d
```

### 4. Verify Services

Wait 30-60 seconds for all services to initialize, then check:

```bash
make status

# Or manually:
docker-compose ps
```

## 🎯 Access the Platform

Once all services are running:

| Service             | URL                   | Description                  |
| ------------------- | --------------------- | ---------------------------- |
| **Dashboard**       | http://localhost:3000 | Main web interface           |
| **Studio**          | http://localhost:3001 | Next.js studio interface     |
| **API Gateway**     | http://localhost:8080 | Unified API endpoint         |
| **Auth Service**    | http://localhost:8001 | Authentication service       |
| **API Service**     | http://localhost:8000 | Core REST API                |
| **Storage Service** | http://localhost:8002 | Delta Lake & file management |
| **Query Engine**    | http://localhost:8003 | Spark SQL interface          |
| **Notebooks**       | http://localhost:8888 | JupyterLab                   |
| **Workspace**       | http://localhost:8889 | Custom notebook workspace    |
| **MinIO Console**   | http://localhost:9001 | Object storage UI            |
| **Spark Master UI** | http://localhost:8081 | Spark cluster dashboard      |
| **PostgreSQL**      | localhost:5432        | Database (psql client)       |

## 👤 Default Credentials

**Admin User:**

- Email: `admin@openbricks.local`
- Password: `openbricks`

**MinIO Console:**

- Username: `openbricks`
- Password: `openbricks123`

**PostgreSQL:**

- User: `openbricks`
- Password: `openbricks`
- Database: `openbricks`

> ⚠️ **Security**: Change these credentials in production!

## 🧪 Test the Setup

### Test Authentication

```bash
# Register a new user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test API (via Gateway)

```bash
# Get token from login response, then:
TOKEN="your-jwt-token-here"

# Create a workspace
curl -X POST http://localhost:8080/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Workspace",
    "description": "Testing OpenBricks"
  }'

# List workspaces
curl http://localhost:8080/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN"
```

## 🛠️ Common Commands

```bash
# Start services
make up

# Stop services
make down

# View logs
make logs

# View logs for specific service
make logs-api
make logs-auth
make logs-storage

# Restart all services
make restart

# Rebuild and restart
make rebuild

# Check service status
make status

# Clean up everything (⚠️ deletes data)
make clean

# Run database migrations
make migrate

# Access PostgreSQL shell
make psql

# Generate new secrets
make secrets
```

## 📊 Service Architecture

```
┌─────────────┐
│  Dashboard  │ (React)
│   :3000     │
└─────────────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ (Express)
│   :8080     │
└─────────────┘
       │
       ├─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼
  ┌────────┐   ┌─────────┐   ┌──────────┐   ┌───────┐
  │  Auth  │   │   API   │   │ Storage  │   │ Query │
  │  :8001 │   │  :8000  │   │  :8002   │   │ :8003 │
  └────────┘   └─────────┘   └──────────┘   └───────┘
       │             │              │             │
       └─────────────┴──────────────┴─────────────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
       ┌────────────┐              ┌────────────┐
       │ PostgreSQL │              │   MinIO    │
       │   :5432    │              │  :9000     │
       └────────────┘              └────────────┘
                                          │
                                          ▼
                                   ┌────────────┐
                                   │   Spark    │
                                   │   Cluster  │
                                   └────────────┘
```

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check port conflicts
lsof -i :3000,8080,8001,5432,9000  # macOS/Linux
netstat -ano | findstr "3000 8080"  # Windows

# View service logs
docker-compose logs
```

### Database connection errors

```bash
# Ensure PostgreSQL is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d postgres
```

### Service timeouts

```bash
# Some services need time to initialize
# Wait 60-90 seconds, then check again
docker-compose ps

# If still unhealthy, check logs
docker-compose logs [service-name]
```

### Port already in use

```bash
# Edit .env to change ports
# Example: DASHBOARD_PORT=3001

# Or stop conflicting services
lsof -ti:3000 | xargs kill  # macOS/Linux
```

## 🔧 Development Tips

### Hot Reload

Most services support hot reload in development:

```bash
# Dashboard (Vite)
cd services/dashboard
npm run dev

# API Service
cd services/api
npm run dev
```

### Database Access

```bash
# Using Make
make psql

# Or directly
docker-compose exec postgres psql -U openbricks -d openbricks

# View tables
\dt

# View users
SELECT id, email, role, created_at FROM users;
```

### MinIO Access

1. Open http://localhost:9001
2. Login with credentials from .env
3. Create buckets and upload files
4. View `openbricks-data` bucket for Delta Lake tables

### Spark Jobs

```bash
# View Spark UI
open http://localhost:8081

# Submit a Spark job
docker-compose exec spark-master spark-submit \
  --master spark://spark-master:7077 \
  /path/to/your/job.py
```

## 📚 Next Steps

- **Read the Architecture**: See [docs/architecture.md](docs/architecture.md)
- **Create a Workspace**: Login to Dashboard → Workspaces → New
- **Run a Notebook**: Notebooks → New → Select Python/SQL
- **Schedule a Job**: Jobs → New → Select notebook and schedule
- **Query Data**: Use the Query Engine or Notebooks for Spark SQL

## 🆘 Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/danielgaio/openbricks/issues)
- **Documentation**: [docs/](docs/)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 🛑 Stopping the Platform

```bash
# Stop all services (preserves data)
make down

# Stop and remove volumes (⚠️ deletes all data)
make clean
```

---

**Built with ❤️ by the OpenBricks community**
