"""
OpenBricks Query Engine Service
Provides a REST API for executing Spark SQL queries with Delta Lake support.
"""

import os
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyspark.sql import SparkSession
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment configuration
SPARK_MASTER_URL = os.getenv('SPARK_MASTER_URL', 'local[*]')
SPARK_DRIVER_MEMORY = os.getenv('SPARK_DRIVER_MEMORY', '2g')
SPARK_EXECUTOR_MEMORY = os.getenv('SPARK_EXECUTOR_MEMORY', '2g')
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://openbricks:openbricks@localhost:5432/openbricks")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "openbricks")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "openbricks123")
QUERY_ROW_LIMIT = int(os.getenv('QUERY_ROW_LIMIT', '1000'))

# Global Spark session
_spark_session = None

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def get_spark_session():
    """Get or create a Spark session with Delta Lake and S3 support."""
    global _spark_session
    if _spark_session is None:
        logger.info("Initializing Spark Session...")
        builder = (SparkSession.builder
            .appName("OpenBricks Query Engine")
            .master(SPARK_MASTER_URL)
            .config("spark.driver.memory", SPARK_DRIVER_MEMORY)
            .config("spark.executor.memory", SPARK_EXECUTOR_MEMORY)
            # Delta Lake Config
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
            # S3/MinIO Config
            .config("spark.hadoop.fs.s3a.endpoint", f"http://{MINIO_ENDPOINT}")
            .config("spark.hadoop.fs.s3a.access.key", MINIO_ACCESS_KEY)
            .config("spark.hadoop.fs.s3a.secret.key", MINIO_SECRET_KEY)
            .config("spark.hadoop.fs.s3a.path.style.access", "true")
            .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
            # Packages (Delta + AWS SDK for S3)
            .config("spark.jars.packages", "io.delta:delta-spark_2.12:3.0.0,org.apache.hadoop:hadoop-aws:3.3.4")
        )
        _spark_session = builder.getOrCreate()
        logger.info("Spark Session initialized.")
        
        # Initial catalog sync
        sync_catalog(_spark_session)
        
    return _spark_session

def sync_catalog(spark):
    """
    Syncs tables from Postgres 'data_tables' to Spark Catalog as Temp Views.
    This allows users to query tables by name (e.g. SELECT * FROM my_table).
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT name, location, format FROM data_tables")
        tables = cur.fetchall()
        conn.close()
        
        for table in tables:
            name = table['name']
            location = table['location']
            fmt = table['format'] or 'delta'
            
            # Register as temp view
            # We use CREATE OR REPLACE TEMP VIEW to update if exists
            # Syntax: CREATE OR REPLACE TEMP VIEW name USING format LOCATION 'path'
            try:
                spark.sql(f"CREATE OR REPLACE TEMP VIEW {name} USING {fmt} LOCATION '{location}'")
                logger.info(f"Registered table '{name}' at '{location}'")
            except Exception as e:
                logger.error(f"Failed to register table '{name}': {e}")
                
    except Exception as e:
        logger.error(f"Catalog sync failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup: Initialize Spark
    try:
        get_spark_session()
    except Exception as e:
        logger.error(f"Failed to initialize Spark on startup: {e}")
    
    yield
    
    # Shutdown
    if _spark_session:
        _spark_session.stop()

app = FastAPI(
    title="OpenBricks Query Engine",
    description="Spark SQL Execution Service",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    success: bool
    columns: List[str] = []
    data: List[Dict[str, Any]] = []
    row_count: int = 0
    truncated: bool = False
    error: Optional[str] = None

# Auth Dependency
async def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    if not x_user_id:
        return None
    return {"id": int(x_user_id), "role": x_user_role}

# Routes
@app.get("/health")
async def health():
    spark_status = "unknown"
    if _spark_session:
        spark_status = "active"
    
    return {
        "status": "healthy",
        "service": "query-engine",
        "spark": spark_status
    }

@app.post("/api/query/sync")
async def trigger_sync(user: Optional[dict] = Depends(get_current_user)):
    """Manually trigger catalog sync (useful after creating new tables)"""
    spark = get_spark_session()
    sync_catalog(spark)
    return {"message": "Catalog sync triggered"}

@app.post("/api/query/sql", response_model=QueryResponse)
async def execute_sql(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    user: Optional[dict] = Depends(get_current_user)
):
    """Execute a Spark SQL query"""
    try:
        spark = get_spark_session()
        
        # Basic security check: Prevent simple SQL injection or destructive commands
        # In a real production system, we need a proper SQL parser/validator
        query_lower = request.query.lower().strip()
        forbidden_keywords = ["drop", "delete", "truncate", "alter", "insert", "update"]
        
        # Allow admins to do anything, restrict users to SELECT
        if user and user.get("role") != "admin":
            for keyword in forbidden_keywords:
                if keyword in query_lower:
                     # Very naive check, but better than nothing for now
                     # A real parser is needed to distinguish "SELECT * FROM drop_table" vs "DROP TABLE"
                     if query_lower.startswith(keyword):
                         raise HTTPException(status_code=403, detail=f"Operation '{keyword}' not allowed for non-admins")

        # Execute Query
        logger.info(f"Executing query: {request.query}")
        df = spark.sql(request.query)
        
        # Collect results
        # Limit rows to prevent OOM
        rows = df.limit(QUERY_ROW_LIMIT + 1).collect()
        columns = df.columns
        
        data = []
        truncated = False
        
        for i, row in enumerate(rows):
            if i >= QUERY_ROW_LIMIT:
                truncated = True
                break
            # Convert Row to dict and handle non-serializable types if needed
            row_dict = row.asDict()
            # Convert datetime/date objects to string if needed (FastAPI handles most, but Spark types can be tricky)
            data.append(row_dict)
            
        return QueryResponse(
            success=True,
            columns=columns,
            data=data,
            row_count=len(data),
            truncated=truncated
        )
        
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        return QueryResponse(
            success=False,
            error=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
