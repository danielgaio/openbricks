# OpenBricks

An open-source, self-hostable data platform inspired by Databricks. Deploy locally or on any cloud infrastructure, similar to how Supabase enables self-hosting of Firebase-like services.

## 🎯 Overview

OpenBricks provides a unified analytics and data engineering platform featuring:

- **Notebooks & Workspaces** - Interactive development environment for data analysis
- **Query Engine** - Apache Spark-based distributed query processing
- **Storage** - Delta Lake compatible data lakehouse storage
- **API Gateway** - REST/GraphQL APIs for integration
- **Authentication** - JWT-based security and access control
- **Studio** - Web-based dashboard and management UI

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Studio (UI)                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                           │
│                  (REST/GraphQL Endpoints)                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐     ┌───────▼───────┐     ┌───────▼───────┐
│   Workspace   │     │ Query Engine  │     │     Auth      │
│   Service     │     │   (Spark)     │     │   Service     │
└───────────────┘     └───────────────┘     └───────────────┘
                              │
                      ┌───────▼───────┐
                      │    Storage    │
                      │ (Delta Lake)  │
                      └───────────────┘
```

## 📁 Project Structure

```
openbricks/
├── docker-compose.yml      # Main orchestration file
├── services/
│   ├── api-gateway/        # REST/GraphQL API gateway
│   ├── query-engine/       # Apache Spark query engine
│   ├── storage/            # Delta Lake storage service
│   ├── auth/               # JWT authentication service
│   ├── workspace/          # Notebook/workspace service
│   └── studio/             # Web-based dashboard UI
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum (16GB recommended)

### Local Development

```bash
# Clone the repository
git clone https://github.com/danielgaio/openbricks.git
cd openbricks

# Start all services
docker compose up -d

# Access the Studio UI
open http://localhost:3000
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Gateway
API_PORT=8080

# Query Engine
SPARK_MASTER_URL=spark://spark-master:7077
SPARK_DRIVER_MEMORY=2g
SPARK_EXECUTOR_MEMORY=2g

# Storage
STORAGE_PATH=/data/lakehouse
DELTA_LAKE_VERSION=2.4.0

# Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=3600

# Studio
STUDIO_PORT=3000
```

## 🔧 Services

### API Gateway
REST and GraphQL endpoints for interacting with the platform.
- Port: 8080
- Technologies: Node.js, Express, Apollo GraphQL

### Query Engine
Distributed query processing using Apache Spark.
- Port: 4040 (Spark UI)
- Technologies: Apache Spark, PySpark

### Storage
Delta Lake compatible storage layer for the data lakehouse.
- Technologies: Delta Lake, MinIO (S3-compatible)

### Auth
JWT-based authentication and authorization service.
- Port: 8081
- Technologies: Node.js, JWT

### Workspace
Interactive notebook environment for data analysis.
- Port: 8888 (Jupyter)
- Technologies: JupyterLab, Python

### Studio
Web-based dashboard for managing and monitoring the platform.
- Port: 3000
- Technologies: React, Next.js

## 📖 Documentation

Detailed documentation is available in the [docs](./docs) directory:

- [Installation Guide](./docs/installation.md)
- [Configuration](./docs/configuration.md)
- [API Reference](./docs/api-reference.md)
- [Development Guide](./docs/development.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Apache Spark](https://spark.apache.org/) - Distributed query engine
- [Delta Lake](https://delta.io/) - Open table format
- [Supabase](https://supabase.com/) - Inspiration for self-hosting architecture