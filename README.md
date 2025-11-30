# OpenBricks 🧱

**The Open Source Data Lakehouse Platform**

OpenBricks is an open-source, self-hostable data analytics platform similar to Databricks, designed to run locally or on any cloud infrastructure. Like Supabase does for Firebase, OpenBricks brings the power of enterprise data platforms to everyone.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)

## 🎯 Vision

OpenBricks aims to provide:
- **Data Lakehouse Architecture**: Combining the flexibility of data lakes with the reliability of data warehouses
- **Interactive Notebooks**: Multi-language support (Python, SQL, Scala, R) for data exploration
- **Scalable Query Engine**: Apache Spark-based distributed computing
- **Delta Lake Storage**: ACID transactions, time travel, and schema evolution
- **Self-Hosting**: Run locally with Docker or deploy to any cloud
- **No Vendor Lock-in**: Open source stack with portable data formats

## 🏗️ Architecture

OpenBricks follows a modular, microservices architecture (similar to Supabase's approach):

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenBricks Studio                        │
│                     (Web Dashboard / UI)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                             │
│              (REST & GraphQL APIs - Kong/Traefik)               │
└─────────────────────────────────────────────────────────────────┘
        │              │              │              │
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│   Auth    │  │ Notebooks │  │   Query   │  │  Storage  │
│ Service   │  │  Service  │  │  Engine   │  │  Service  │
│ (JWT/SSO) │  │ (Jupyter) │  │  (Spark)  │  │(Delta/S3) │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
        │              │              │              │
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Metadata)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Object Storage (MinIO/S3)                    │
│                       Delta Lake Tables                         │
└─────────────────────────────────────────────────────────────────┘
```

### Core Services

| Service | Technology | Purpose |
|---------|------------|---------|
| **API Gateway** | Kong/Traefik | Unified API access, rate limiting, routing |
| **Auth Service** | Custom (Go) | JWT authentication, RBAC, SSO integration |
| **Notebooks** | JupyterHub | Interactive data science environment |
| **Query Engine** | Apache Spark | Distributed data processing |
| **Storage** | MinIO + Delta Lake | Object storage with ACID transactions |
| **Dashboard** | React/TypeScript | Web UI for platform management |
| **Metadata DB** | PostgreSQL | Catalogs, users, jobs metadata |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (v2.0+)
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

### Local Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/danielgaio/openbricks.git
   cd openbricks
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start OpenBricks**
   ```bash
   docker compose up -d
   ```

4. **Access the platform**
   - Dashboard: http://localhost:3000
   - Notebooks: http://localhost:8888
   - API: http://localhost:8080
   - Spark UI: http://localhost:4040

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Dashboard | admin | openbricks |
| JupyterHub | admin | openbricks |
| PostgreSQL | openbricks | openbricks |
| MinIO | openbricks | openbricks123 |

> ⚠️ **Security Note**: Change all default passwords before production use!

## 📁 Project Structure

```
openbricks/
├── docker/                 # Docker configurations
│   ├── api/               # API Gateway config
│   ├── spark/             # Spark cluster config
│   └── nginx/             # Reverse proxy config
├── services/              # Core services
│   ├── api/               # REST/GraphQL API service
│   ├── auth/              # Authentication service
│   ├── notebooks/         # Jupyter notebook service
│   ├── query-engine/      # Spark query engine
│   ├── storage/           # Storage management service
│   └── dashboard/         # Web UI (React app)
├── scripts/               # Utility scripts
│   ├── setup.sh           # Initial setup
│   └── backup.sh          # Backup utilities
├── docs/                  # Documentation
├── docker-compose.yml     # Main compose file
├── .env.example           # Environment template
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENBRICKS_PORT` | Main dashboard port | 3000 |
| `POSTGRES_PASSWORD` | Database password | openbricks |
| `MINIO_ROOT_PASSWORD` | Object storage password | openbricks123 |
| `JWT_SECRET` | JWT signing secret | (generate one!) |
| `SPARK_DRIVER_MEMORY` | Spark driver memory | 2g |
| `SPARK_EXECUTOR_MEMORY` | Spark executor memory | 2g |

### Scaling

For production deployments, adjust the following in `docker-compose.yml`:

```yaml
services:
  spark-worker:
    deploy:
      replicas: 3  # Number of Spark workers
      resources:
        limits:
          cpus: '4'
          memory: 8G
```

## 🌐 Cloud Deployment

### AWS
```bash
./scripts/deploy-aws.sh
```

### Google Cloud
```bash
./scripts/deploy-gcp.sh
```

### Azure
```bash
./scripts/deploy-azure.sh
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## 📊 Features

### Data Management
- [x] Delta Lake table support
- [x] Schema management and evolution
- [x] Data catalog with Unity-style governance
- [x] Time travel queries
- [ ] Data lineage tracking (coming soon)

### Compute
- [x] Apache Spark clusters
- [x] Auto-scaling workers
- [x] Job scheduling
- [ ] Serverless SQL (coming soon)
- [ ] ML Runtime (coming soon)

### Collaboration
- [x] Interactive notebooks
- [x] Real-time collaboration
- [x] Version control integration
- [ ] Comments and annotations (coming soon)

### Security
- [x] JWT authentication
- [x] Role-based access control (RBAC)
- [x] Row-level security
- [ ] SSO/SAML integration (coming soon)
- [ ] Audit logging (coming soon)

## 🛠️ Development

### Setting up the development environment

```bash
# Install dependencies
npm install  # For dashboard
pip install -r requirements.txt  # For Python services

# Start services in dev mode
docker compose -f docker-compose.dev.yml up -d

# Run tests
npm test
pytest
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [API Documentation](docs/api.md)
- [Architecture Overview](docs/architecture.md)
- [Security Best Practices](docs/security.md)

## 🔗 Related Projects

OpenBricks is built on top of amazing open-source projects:

- [Apache Spark](https://spark.apache.org/) - Distributed computing engine
- [Delta Lake](https://delta.io/) - Open table format for data lakes
- [JupyterHub](https://jupyter.org/hub) - Multi-user notebook server
- [PostgreSQL](https://postgresql.org/) - Relational database
- [MinIO](https://min.io/) - S3-compatible object storage
- [Kong](https://konghq.com/) - API Gateway

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Inspired by:
- [Databricks](https://databricks.com/) - For pioneering the Lakehouse architecture
- [Supabase](https://supabase.com/) - For showing how to build open-source alternatives
- The open-source data community

---

<p align="center">
  <strong>Built with ❤️ by the community, for the community</strong>
</p>