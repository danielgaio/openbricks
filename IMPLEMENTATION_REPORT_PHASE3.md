# Implementation Report: Storage Service Hardening

## 1. Project Analysis & Task Selection

**Analysis**: The **Storage Service** was identified as a critical component that was functionally incomplete and insecure. While basic CRUD operations existed, they ignored the `owner_id` field in the database, meaning all data was effectively unowned and insecure. Additionally, data deletion logic was missing.
**Selected Task**: **Harden and Complete Storage Service Implementation**.
**Justification**:

- **Security**: Enforcing ownership prevents users from deleting or seeing each other's private data.
- **Functionality**: Implementing data deletion (cleaning up MinIO objects when a table is deleted) is essential for resource management.
- **Reliability**: Adding tests ensures the service behaves as expected.

## 2. Implemented Changes

### A. Storage Service (`services/storage/main.py`)

- **Authentication Integration**: Added `get_current_user` dependency to extract `X-User-Id` and `X-User-Role` headers injected by the API Gateway.
- **Ownership Enforcement**:
  - `create_table`: Now captures and stores the `owner_id`.
  - `delete_table`: Now checks if the requester is the **Owner** or an **Admin**. Returns `403 Forbidden` otherwise.
  - `list_tables`: Now filters results. Admins see all; Users see their own + public tables.
- **Data Management**:
  - Implemented the `drop_data` logic in `delete_table`. It now recursively deletes objects from MinIO when a table is dropped (if requested).

### B. Dependencies (`services/storage/requirements.txt`)

- Added `pytest` and `httpx` to support the new test suite.

### C. Testing (`services/storage/test_main.py`)

- Created a comprehensive test suite using `pytest` and `TestClient`.
- **Tests Covered**:
  - `test_health_check`: Verifies service health.
  - `test_create_table_authenticated`: Verifies `owner_id` is correctly saved.
  - `test_delete_table_unauthorized`: Verifies non-owners cannot delete tables.
  - `test_delete_table_admin`: Verifies admins can delete any table.
  - `test_list_tables_filtering`: Verifies users only see their own data.

## 3. Verification & Deployment

### How to Deploy

1.  **Rebuild the Storage Service** (to install new dependencies):
    ```bash
    docker-compose build storage-service
    docker-compose up -d storage-service
    ```

### How to Test

1.  **Run Unit Tests**:

    ```bash
    make test-storage
    ```

    _Expected Output_: `===== 5 passed in 0.xxs =====`

2.  **Manual Verification**:
    - Login via Dashboard/API to get a token.
    - Create a table via `POST /api/storage/tables`.
    - Try to delete it with a different user token (should fail).
    - Delete it with the same user token (should succeed).

## 4. Next Steps

- **Query Engine**: The `query-engine` service is the next logical target. It needs to be able to read the Delta tables created by the Storage Service.
- **Spark Integration**: Ensure the Spark Master/Worker containers are correctly configured to access MinIO using the same credentials.
- **Frontend**: Update the Dashboard "Data" page to list tables using the new API.
