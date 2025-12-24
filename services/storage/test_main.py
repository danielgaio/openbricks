import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from main import app, get_db_connection, minio_client

client = TestClient(app)

# Mock Database Connection
@pytest.fixture
def mock_db():
    with patch("main.get_db_connection") as mock:
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        mock.return_value = conn
        yield conn, cursor

# Mock MinIO Client
@pytest.fixture
def mock_minio():
    with patch("main.minio_client") as mock:
        yield mock

def test_health_check(mock_db, mock_minio):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_create_table_authenticated(mock_db):
    conn, cursor = mock_db
    cursor.fetchone.return_value = {
        "id": 1, "name": "test_table", "database": "default", 
        "owner_id": 123, "location": "s3a://bucket/path"
    }

    headers = {"X-User-Id": "123", "X-User-Role": "user"}
    payload = {
        "name": "test_table",
        "database": "default",
        "format": "delta"
    }

    response = client.post("/api/storage/tables", json=payload, headers=headers)
    
    assert response.status_code == 200
    assert response.json()["table"]["owner_id"] == 123
    
    # Verify owner_id was passed to INSERT
    call_args = cursor.execute.call_args
    assert call_args[0][1][5] == 123  # 6th parameter is owner_id

def test_delete_table_unauthorized(mock_db):
    conn, cursor = mock_db
    # Table owned by someone else
    cursor.fetchone.return_value = {"id": 1, "name": "test", "owner_id": 999, "location": "s3a://b/p"}

    headers = {"X-User-Id": "123", "X-User-Role": "user"}
    
    response = client.delete("/api/storage/tables/1", headers=headers)
    
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]

def test_delete_table_admin(mock_db, mock_minio):
    conn, cursor = mock_db
    # Table owned by someone else
    cursor.fetchone.return_value = {"id": 1, "name": "test", "owner_id": 999, "location": "s3a://b/p"}

    headers = {"X-User-Id": "123", "X-User-Role": "admin"}
    
    response = client.delete("/api/storage/tables/1", headers=headers)
    
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]

def test_list_tables_filtering(mock_db):
    conn, cursor = mock_db
    cursor.fetchall.return_value = []

    headers = {"X-User-Id": "123", "X-User-Role": "user"}
    
    client.get("/api/storage/tables", headers=headers)
    
    # Verify query contains ownership check
    call_args = cursor.execute.call_args
    query = call_args[0][0]
    assert "owner_id = %s" in query
    assert "is_public = true" in query
