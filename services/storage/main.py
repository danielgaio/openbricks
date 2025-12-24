"""
OpenBricks Storage Service
Manages Delta Lake tables and object storage
"""

import os
import logging
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from minio import Minio
from minio.error import S3Error
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://openbricks:openbricks@localhost:5432/openbricks")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "openbricks")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "openbricks123")
SPARK_MASTER_URL = os.getenv("SPARK_MASTER_URL", "spark://localhost:7077")

# Initialize MinIO client
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

# Default bucket name
DEFAULT_BUCKET = "openbricks-data"


def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting OpenBricks Storage Service")
    
    # Ensure default bucket exists
    try:
        if not minio_client.bucket_exists(DEFAULT_BUCKET):
            minio_client.make_bucket(DEFAULT_BUCKET)
            logger.info(f"Created default bucket: {DEFAULT_BUCKET}")
    except S3Error as e:
        logger.warning(f"Could not create default bucket: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down OpenBricks Storage Service")


app = FastAPI(
    title="OpenBricks Storage Service",
    description="Delta Lake and object storage management",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class TableCreate(BaseModel):
    name: str
    database: str = "default"
    schema_definition: Optional[dict] = None
    location: Optional[str] = None
    format: str = "delta"


class TableInfo(BaseModel):
    id: int
    name: str
    database: str
    format: str
    location: str
    schema_definition: Optional[dict]
    created_at: datetime
    updated_at: datetime


class BucketCreate(BaseModel):
    name: str


class FileUploadResponse(BaseModel):
    path: str
    size: int
    etag: str


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "openbricks-storage",
        "version": "0.1.0",
        "checks": {}
    }
    
    # Check database
    try:
        conn = get_db_connection()
        conn.close()
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check MinIO
    try:
        minio_client.list_buckets()
        health_status["checks"]["minio"] = "healthy"
    except Exception as e:
        health_status["checks"]["minio"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


# Bucket management
@app.get("/api/storage/buckets")
async def list_buckets():
    """List all storage buckets"""
    try:
        buckets = minio_client.list_buckets()
        return {
            "buckets": [
                {
                    "name": bucket.name,
                    "creation_date": bucket.creation_date.isoformat()
                }
                for bucket in buckets
            ]
        }
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/storage/buckets")
async def create_bucket(bucket: BucketCreate):
    """Create a new storage bucket"""
    try:
        if minio_client.bucket_exists(bucket.name):
            raise HTTPException(status_code=409, detail="Bucket already exists")
        
        minio_client.make_bucket(bucket.name)
        return {"message": f"Bucket '{bucket.name}' created successfully"}
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/storage/buckets/{bucket_name}")
async def delete_bucket(bucket_name: str):
    """Delete a storage bucket"""
    try:
        # Check if bucket is empty
        objects = list(minio_client.list_objects(bucket_name, recursive=True))
        if objects:
            raise HTTPException(status_code=400, detail="Bucket is not empty")
        
        minio_client.remove_bucket(bucket_name)
        return {"message": f"Bucket '{bucket_name}' deleted successfully"}
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


# File management
@app.get("/api/storage/files/{bucket_name}")
async def list_files(
    bucket_name: str,
    prefix: str = Query(default="", description="Path prefix to filter files"),
    recursive: bool = Query(default=False, description="List files recursively")
):
    """List files in a bucket"""
    try:
        objects = minio_client.list_objects(bucket_name, prefix=prefix, recursive=recursive)
        return {
            "files": [
                {
                    "name": obj.object_name,
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                    "is_dir": obj.is_dir
                }
                for obj in objects
            ]
        }
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/storage/files/{bucket_name}")
async def upload_file(
    bucket_name: str,
    file: UploadFile = File(...),
    path: str = Query(default="", description="Path within the bucket")
):
    """Upload a file to a bucket"""
    try:
        object_name = f"{path}/{file.filename}".lstrip("/")
        
        # Get file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        result = minio_client.put_object(
            bucket_name,
            object_name,
            file.file,
            file_size,
            content_type=file.content_type
        )
        
        return FileUploadResponse(
            path=object_name,
            size=file_size,
            etag=result.etag
        )
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/storage/files/{bucket_name}/{file_path:path}")
async def delete_file(bucket_name: str, file_path: str):
    """Delete a file from a bucket"""
    try:
        minio_client.remove_object(bucket_name, file_path)
        return {"message": f"File '{file_path}' deleted successfully"}
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


# Table management (Delta Lake catalog)
@app.get("/api/storage/tables")
async def list_tables(database: str = Query(default="default")):
    """List all Delta Lake tables"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM data_tables WHERE database = %s ORDER BY name",
            (database,)
        )
        tables = cur.fetchall()
        conn.close()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/storage/tables")
async def create_table(table: TableCreate):
    """Register a new Delta Lake table"""
    try:
        location = table.location or f"s3a://{DEFAULT_BUCKET}/tables/{table.database}/{table.name}"
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO data_tables (name, database, format, location, schema_definition)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (table.name, table.database, table.format, location, 
             psycopg2.extras.Json(table.schema_definition) if table.schema_definition else None)
        )
        new_table = cur.fetchone()
        conn.commit()
        conn.close()
        
        return {"table": new_table}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/storage/tables/{table_id}")
async def get_table(table_id: int):
    """Get table details"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM data_tables WHERE id = %s", (table_id,))
        table = cur.fetchone()
        conn.close()
        
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        return {"table": table}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/storage/tables/{table_id}")
async def delete_table(table_id: int, drop_data: bool = Query(default=False)):
    """Delete a table from the catalog"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get table info first
        cur.execute("SELECT * FROM data_tables WHERE id = %s", (table_id,))
        table = cur.fetchone()
        
        if not table:
            conn.close()
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Delete from catalog
        cur.execute("DELETE FROM data_tables WHERE id = %s", (table_id,))
        conn.commit()
        conn.close()
        
        # Optionally drop data from storage
        if drop_data and table["location"]:
            # TODO: Implement data deletion from MinIO/S3
            pass
        
        return {"message": f"Table '{table['name']}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
