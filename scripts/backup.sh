#!/bin/bash

# OpenBricks Backup Script
# Creates backups of PostgreSQL database and MinIO data

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🧱 OpenBricks Backup"
echo "===================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "📦 Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump -U openbricks openbricks > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"
echo "✅ PostgreSQL backup: $BACKUP_DIR/postgres_$TIMESTAMP.sql"

# Backup MinIO data
echo "📦 Backing up MinIO data..."
docker run --rm -v openbricks_minio-data:/data -v "$PWD/$BACKUP_DIR":/backup alpine \
    tar czf /backup/minio_$TIMESTAMP.tar.gz -C /data .
echo "✅ MinIO backup: $BACKUP_DIR/minio_$TIMESTAMP.tar.gz"

# Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo ""
echo "✅ Backup complete!"
echo "Backup location: $BACKUP_DIR"
