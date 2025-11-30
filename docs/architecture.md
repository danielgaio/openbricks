# OpenBricks Architecture

This document describes the architecture of OpenBricks, an open-source data lakehouse platform.

## Overview

OpenBricks follows a microservices architecture, where each component is a separate service that can be independently developed, deployed, and scaled. This design is inspired by Supabase's approach to building open-source alternatives to proprietary platforms.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│                                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │  Web Browser │  │  REST API    │  │  Python SDK  │  │  CLI Tool    │   │
│   │  (Dashboard) │  │  Clients     │  │              │  │              │   │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             API Gateway (Traefik)                            │
│                        Load Balancing, SSL, Routing                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Auth Service  │        │   API Service   │        │ Storage Service │
│     (Go)        │        │   (Node.js)     │        │    (Python)     │
│                 │        │                 │        │                 │
│ - JWT Auth      │        │ - REST API      │        │ - File Mgmt     │
│ - RBAC          │        │ - Workspaces    │        │ - Table Catalog │
│ - SSO           │        │ - Jobs          │        │ - Delta Lake    │
└─────────────────┘        └─────────────────┘        └─────────────────┘
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Data Layer                                          │
│                                                                             │
│   ┌─────────────────┐           ┌─────────────────────────────────────────┐ │
│   │   PostgreSQL    │           │            Apache Spark                 │ │
│   │                 │           │                                         │ │
│   │ - User data     │           │ ┌─────────┐  ┌─────────┐  ┌─────────┐  │ │
│   │ - Metadata      │           │ │ Master  │  │ Worker  │  │ Worker  │  │ │
│   │ - Job history   │           │ │         │  │         │  │         │  │ │
│   │ - Catalog       │           │ └─────────┘  └─────────┘  └─────────┘  │ │
│   └─────────────────┘           └─────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Object Storage (MinIO/S3)                             │
│                                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ Delta Lake  │  │   Parquet   │  │    JSON     │  │    CSV      │       │
│   │   Tables    │  │   Files     │  │    Files    │  │   Files     │       │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Gateway (Traefik)

The API Gateway serves as the single entry point for all client requests.

**Responsibilities:**
- Request routing to appropriate services
- Load balancing across service instances
- SSL/TLS termination
- Rate limiting and throttling
- Request/response transformation

**Configuration:**
- Routes requests based on path prefixes
- Provides automatic service discovery with Docker
- Handles HTTPS certificates with Let's Encrypt

### 2. Auth Service (Go)

Handles all authentication and authorization concerns.

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Role-based access control (RBAC)
- API key management
- SSO integration (OAuth2, SAML)

**Key Features:**
- Stateless JWT authentication
- Refresh token rotation
- Password hashing with bcrypt
- Integration with PostgreSQL for user storage

### 3. API Service (Node.js)

The main REST API for platform operations.

**Responsibilities:**
- Workspace management
- Notebook CRUD operations
- Job scheduling and management
- Cluster lifecycle management
- User settings and preferences

**Key Features:**
- Express.js framework
- OpenAPI/Swagger documentation
- Request validation with express-validator
- Structured logging with Winston

### 4. Storage Service (Python)

Manages data storage and the data catalog.

**Responsibilities:**
- File upload/download to MinIO
- Delta Lake table management
- Schema management and evolution
- Data catalog operations
- Time travel queries

**Key Features:**
- FastAPI framework
- MinIO SDK for S3 operations
- PySpark for Delta Lake operations
- Async request handling

### 5. Notebooks Service (JupyterHub)

Provides interactive notebook capabilities.

**Responsibilities:**
- Multi-user notebook server
- Support for Python, SQL, Scala, R
- Spark context management
- Notebook version control

**Key Features:**
- JupyterLab interface
- Pre-configured Spark connectivity
- Custom kernels for different languages
- Persistent workspace storage

### 6. Query Engine (Apache Spark)

Distributed data processing engine.

**Responsibilities:**
- Large-scale data processing
- SQL query execution
- Delta Lake read/write
- Machine learning workloads

**Key Features:**
- Spark SQL interface
- Delta Lake integration
- Auto-scaling workers
- Memory and resource management

### 7. Dashboard (React)

Web-based user interface.

**Responsibilities:**
- Visual management of all platform resources
- Real-time status monitoring
- Interactive data exploration
- Job and cluster management

**Key Features:**
- React with TypeScript
- TailwindCSS for styling
- React Query for data fetching
- Responsive design

## Data Flow

### Query Execution Flow

```
1. User submits query via Dashboard/API
          │
          ▼
2. API Service validates request
          │
          ▼
3. Auth Service verifies permissions
          │
          ▼
4. Query Engine (Spark) processes query
          │
          ▼
5. Data read from MinIO (Delta Lake)
          │
          ▼
6. Results returned to user
```

### Job Scheduling Flow

```
1. User creates job with schedule
          │
          ▼
2. API Service stores job in PostgreSQL
          │
          ▼
3. Job scheduler triggers at defined time
          │
          ▼
4. Notebook executed on Spark cluster
          │
          ▼
5. Results stored, notifications sent
```

## Security Model

### Authentication

- JWT-based authentication for API access
- Token refresh mechanism
- Session management

### Authorization

- Role-based access control (RBAC)
- Resource-level permissions
- Row-level security for data access

### Data Security

- Encryption at rest (MinIO)
- Encryption in transit (TLS)
- Audit logging

## Scalability

### Horizontal Scaling

- API services can be replicated behind load balancer
- Spark workers can be added/removed dynamically
- MinIO supports distributed mode

### Vertical Scaling

- Increase memory/CPU for Spark workers
- Scale PostgreSQL with replicas
- Increase MinIO storage capacity

## Deployment Options

### Local Development
- Docker Compose with all services
- Single-node Spark cluster
- Local MinIO instance

### Production (Cloud)
- Kubernetes deployment
- Managed PostgreSQL (RDS, Cloud SQL)
- Cloud object storage (S3, GCS, Azure Blob)
- Auto-scaling Spark cluster

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Gateway | Traefik | Routing, SSL, Load Balancing |
| Auth Service | Go | Authentication, Authorization |
| API Service | Node.js (Express) | REST API |
| Storage Service | Python (FastAPI) | File & Table Management |
| Notebooks | JupyterHub | Interactive Computing |
| Query Engine | Apache Spark | Data Processing |
| Metadata DB | PostgreSQL | Platform Metadata |
| Object Storage | MinIO | Data Lake Storage |
| Dashboard | React (TypeScript) | Web Interface |
