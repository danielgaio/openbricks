# Implementation Report: Query Engine Service

## 1. Project Analysis & Task Selection

**Analysis**: The **Query Engine** (`services/query-engine`) was a placeholder service using Flask, lacking critical configurations for S3/MinIO connectivity and authentication. It could not actually query the Delta tables created by the Storage Service.
**Selected Task**: **Implement Production-Ready Query Engine**.
**Justification**:

- **Core Value**: Without a working query engine, the "Data Lakehouse" is just a "Data Swamp" (write-only).
- **Integration**: Connects the Storage Service (data) to the User (analysis).
- **Consistency**: Migrating to FastAPI aligns with the Storage Service stack.

## 2. Implemented Changes

### A. Query Engine (`services/query-engine/src/server.py`)

- **Framework Migration**: Switched from Flask to **FastAPI** for async support, type safety, and auto-generated docs.
- **Spark Configuration**:
  - Added `hadoop-aws` and `delta-spark` packages.
  - Configured `spark.hadoop.fs.s3a.*` settings to connect to MinIO.
- **Catalog Sync**: Implemented `sync_catalog()` which queries the Postgres `data_tables` and registers them as **Spark Temporary Views**. This allows users to write `SELECT * FROM my_table` instead of complex paths.
- **Authentication**: Added `get_current_user` dependency to consume Gateway headers.
- **Security**: Added basic SQL keyword blocking (DROP, DELETE, etc.) for non-admin users.

### B. Dockerfile (`services/query-engine/Dockerfile`)

- Updated base image dependencies to include `fastapi`, `uvicorn`, `psycopg2-binary`.
- Switched entrypoint to `uvicorn`.

## 3. Verification & Deployment

### How to Deploy

1.  **Rebuild the Query Engine**:
    ```bash
    docker-compose build query-engine
    docker-compose up -d query-engine
    ```

### How to Test

1.  **Manual Verification**:
    - Create a table via Storage Service.
    - Call `POST /api/query/sync` to register it in Spark.
    - Call `POST /api/query/sql` with `{"query": "SELECT * FROM my_table"}`.

## 4. Next Steps

- **Frontend Integration**: Connect the "SQL Lab" in the Dashboard to this new API.
- **Spark Cluster**: Ensure the standalone Spark Master/Worker containers also have the necessary JARs if we decide to submit jobs to them instead of running in client mode (currently running in client mode inside the container).
- **Advanced Security**: Implement a real SQL parser for fine-grained access control (column-level security).
