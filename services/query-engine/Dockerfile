FROM bitnami/spark:3.5

USER root

# Install Python packages
RUN pip install --no-cache-dir \
    delta-spark==3.0.0 \
    pyspark==3.5.0 \
    fastapi==0.108.0 \
    uvicorn==0.25.0 \
    psycopg2-binary==2.9.9 \
    python-multipart==0.0.6

# Copy application code
COPY src/ /app/src/

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1001 spark-user && chown -R spark-user:spark-user /app

USER spark-user

EXPOSE 8003

CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8003"]
