#!/bin/bash

# OpenBricks Setup Script
# This script initializes the OpenBricks platform

set -e

echo "🧱 OpenBricks Setup"
echo "===================="

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s|your-super-secret-jwt-key-change-me-in-production|$JWT_SECRET|g" .env
    
    echo "✅ Created .env file with generated JWT secret"
else
    echo "✅ .env file already exists"
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p data/postgres
mkdir -p data/minio
mkdir -p data/spark
mkdir -p data/notebooks

# Pull required Docker images
echo "📥 Pulling Docker images..."
docker compose pull

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start OpenBricks, run:"
echo "  docker compose up -d"
echo ""
echo "Access the platform at:"
echo "  Dashboard:  http://localhost:3000"
echo "  Notebooks:  http://localhost:8888"
echo "  API:        http://localhost:8000"
echo "  Spark UI:   http://localhost:8082"
echo "  MinIO:      http://localhost:9001"
echo ""
echo "Default credentials:"
echo "  Dashboard:  admin@openbricks.local / openbricks"
echo "  MinIO:      openbricks / openbricks123"
echo ""
