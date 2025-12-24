# OpenBricks

**OpenBricks** is an open-source data lakehouse platform inspired by Databricks and Supabase. Built with a modern microservices architecture, it provides a complete solution for data engineering, analytics, and machine learning workloads.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](docker-compose.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## ✨ Features

- 🔐 **Enterprise Authentication** - JWT-based auth with RBAC and SSO support
- 📊 **Data Lakehouse** - Delta Lake on MinIO/S3 with ACID transactions
- ⚡ **Distributed Computing** - Apache Spark for large-scale data processing
- 📓 **Interactive Notebooks** - JupyterLab with Spark integration
- 🔄 **Job Scheduling** - Automated ETL and ML pipeline execution
- 🎯 **REST API** - Comprehensive API for all platform operations
- 🖥️ **Web Dashboard** - React-based UI for managing all resources
- 🐳 **Containerized** - Full Docker Compose setup for easy deployment

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/danielgaio/openbricks.git
cd openbricks

# Setup environment
cp .env.example .env

# Start all services
make up

# Wait 30-60 seconds, then access:
# - Dashboard: http://localhost:3000
# - API Gateway: http://localhost:8080
# - MinIO Console: http://localhost:9001
```

**Default login:**

- Email: `admin@openbricks.local`
- Password: `openbricks`

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get started in minutes
- [Architecture Overview](docs/architecture.md) - System design and components
- [Installation Guide](docs/installation.md) - Detailed setup instructions
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## 🏗️ Architecture

OpenBricks follows a microservices architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  Dashboard (React) • Studio (Next.js) • Python SDK • CLI    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Node.js)                     │
│         Routing • Load Balancing • Rate Limiting             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Auth Service │    │ API Service  │    │   Storage    │
│    (Go)      │    │  (Node.js)   │    │  (Python)    │
│              │    │              │    │              │
│ • JWT Auth   │    │ • Workspaces │    │ • Delta Lake │
│ • RBAC       │    │ • Notebooks  │    │ • MinIO      │
│ • Users      │    │ • Jobs       │    │ • Catalog    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │  PostgreSQL  │        │ Apache Spark │
        │   Metadata   │        │   + MinIO    │
        └──────────────┘        └──────────────┘
```

### Core Components

| Component           | Technology       | Purpose                         |
| ------------------- | ---------------- | ------------------------------- |
| **API Gateway**     | Node.js/Express  | Request routing, load balancing |
| **Auth Service**    | Go               | JWT authentication, RBAC        |
| **API Service**     | Node.js/Express  | REST API for resources          |
| **Storage Service** | Python/FastAPI   | Delta Lake, file management     |
| **Query Engine**    | Apache Spark     | Data processing, SQL queries    |
| **Notebooks**       | JupyterLab       | Interactive computing           |
| **Dashboard**       | React/TypeScript | Web interface                   |
| **PostgreSQL**      | PostgreSQL 16    | Metadata storage                |
| **MinIO**           | MinIO            | Object storage (S3-compatible)  |

## 🛠️ Development

### Prerequisites

- Docker Desktop 20.10+ with Docker Compose v2
- Node.js 18+ (for local development)
- Go 1.21+ (for auth service development)
- Python 3.11+ (for storage service development)
- 8GB RAM minimum, 16GB recommended
- 20GB disk space

### Common Commands

```bash
make help          # Show all available commands
make up            # Start all services
make down          # Stop all services
make logs          # View logs
make status        # Check service health
make psql          # Access PostgreSQL shell
make secrets       # Generate new secrets
make clean         # Remove all data (⚠️ destructive)
```

### Running Individual Services

```bash
# API Service (development mode)
cd services/api
npm install
npm run dev

# Auth Service
cd services/auth
go run cmd/main.go

# Storage Service
cd services/storage
pip install -r requirements.txt
python main.py

# Dashboard
cd services/dashboard
npm install
npm run dev
```

## 🧪 Testing

```bash
# Run all tests
make test

# Test specific service
make test-api
make test-auth
make test-storage
```

## 🔐 Security

- JWT-based stateless authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Helmet.js security headers
- SQL injection prevention
- CORS configuration
- Environment-based secrets

**Security Best Practices:**

1. Change default passwords in `.env`
2. Generate strong JWT secrets: `openssl rand -base64 32`
3. Enable HTTPS in production
4. Configure proper CORS origins
5. Implement secrets management (Vault, AWS Secrets Manager)

## 📊 Usage Examples

### Create a Workspace via API

```bash
# Login and get token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@openbricks.local","password":"openbricks"}' \
  | jq -r '.token')

# Create workspace
curl -X POST http://localhost:8080/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Workspace","description":"Data science projects"}'
```

### Run a Notebook

1. Access JupyterLab: http://localhost:8888
2. Create a new Python notebook
3. Connect to Spark:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("OpenBricks") \
    .master("spark://spark-master:7077") \
    .getOrCreate()

# Read Delta table
df = spark.read.format("delta").load("s3a://openbricks-data/tables/my_table")
df.show()
```

## 🚢 Deployment

### Local Development

```bash
make setup  # One-command setup
```

### Production (Docker Compose)

```bash
# Use production .env configuration
cp .env.example .env.production
# Edit .env.production with production values
docker-compose --env-file .env.production up -d
```

### Kubernetes

Coming soon! We're working on Helm charts for Kubernetes deployment.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Databricks](https://databricks.com) and [Supabase](https://supabase.com)
- Built with amazing open-source technologies
- Thanks to all contributors!

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/danielgaio/openbricks/issues)
- **Discussions**: [GitHub Discussions](https://github.com/danielgaio/openbricks/discussions)

---

**⭐ Star this repo if you find it useful!**
