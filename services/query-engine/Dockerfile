FROM bitnami/spark:3.5

USER root

# Install Python packages for Delta Lake
RUN pip install --no-cache-dir \
    delta-spark==3.0.0 \
    pyspark==3.5.0 \
    flask==3.0.0 \
    flask-cors==4.0.0

# Copy application code
COPY src/ /app/src/

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1001 spark && chown -R spark:spark /app

USER spark

EXPOSE 5000

CMD ["python", "src/server.py"]
