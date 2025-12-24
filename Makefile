.PHONY: help up down restart rebuild status logs clean psql secrets migrate test lint

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)OpenBricks - Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

up: ## Start all services in detached mode
	@echo "$(BLUE)Starting OpenBricks services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started!$(NC)"
	@echo "$(YELLOW)Wait 30-60 seconds for initialization, then run: make status$(NC)"

down: ## Stop all services
	@echo "$(BLUE)Stopping OpenBricks services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)Restarting OpenBricks services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

rebuild: ## Rebuild and restart all services
	@echo "$(BLUE)Rebuilding OpenBricks services...$(NC)"
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "$(GREEN)✓ Services rebuilt and started$(NC)"

status: ## Check status of all services
	@echo "$(BLUE)OpenBricks Service Status:$(NC)"
	@docker-compose ps

logs: ## View logs for all services
	docker-compose logs -f

logs-api: ## View logs for API service
	docker-compose logs -f api-service

logs-auth: ## View logs for Auth service
	docker-compose logs -f auth-service

logs-storage: ## View logs for Storage service
	docker-compose logs -f storage-service

logs-gateway: ## View logs for API Gateway
	docker-compose logs -f api-gateway

logs-dashboard: ## View logs for Dashboard
	docker-compose logs -f dashboard

logs-db: ## View logs for PostgreSQL
	docker-compose logs -f postgres

logs-minio: ## View logs for MinIO
	docker-compose logs -f minio

logs-spark: ## View logs for Spark master
	docker-compose logs -f spark-master

clean: ## Stop services and remove volumes (WARNING: deletes all data)
	@echo "$(RED)⚠️  WARNING: This will delete all data!$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to cancel, or Enter to continue...$(NC)"
	@read confirm
	docker-compose down -v
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

psql: ## Connect to PostgreSQL shell
	@docker-compose exec postgres psql -U openbricks -d openbricks

migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	@docker-compose exec postgres psql -U openbricks -d openbricks -f /docker-entrypoint-initdb.d/01-schema.sql
	@echo "$(GREEN)✓ Migrations complete$(NC)"

secrets: ## Generate new secrets for .env file
	@echo "$(BLUE)Generating secure secrets...$(NC)"
	@echo ""
	@echo "$(GREEN)JWT_SECRET:$(NC)"
	@openssl rand -base64 32
	@echo ""
	@echo "$(GREEN)NEXTAUTH_SECRET:$(NC)"
	@openssl rand -base64 32
	@echo ""
	@echo "$(GREEN)POSTGRES_PASSWORD:$(NC)"
	@openssl rand -base64 24
	@echo ""
	@echo "$(GREEN)MINIO_ROOT_PASSWORD:$(NC)"
	@openssl rand -base64 24
	@echo ""
	@echo "$(YELLOW)Copy these values to your .env file$(NC)"

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	@docker-compose exec api-service npm test
	@docker-compose exec auth-service go test ./...
	@docker-compose exec storage-service pytest
	@echo "$(GREEN)✓ Tests complete$(NC)"

test-api: ## Run API service tests
	@docker-compose exec api-service npm test

test-auth: ## Run Auth service tests
	@docker-compose exec auth-service go test ./... -v

test-storage: ## Run Storage service tests
	@docker-compose exec storage-service pytest -v

lint: ## Run linters for all services
	@echo "$(BLUE)Running linters...$(NC)"
	@docker-compose exec api-service npm run lint
	@docker-compose exec dashboard npm run lint
	@echo "$(GREEN)✓ Linting complete$(NC)"

lint-fix: ## Fix linting issues automatically
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	@docker-compose exec api-service npm run lint -- --fix
	@docker-compose exec dashboard npm run lint -- --fix
	@echo "$(GREEN)✓ Linting fixes applied$(NC)"

install: ## Install dependencies for all services
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@cd services/api && npm install
	@cd services/api-gateway && npm install
	@cd services/dashboard && npm install
	@cd services/studio && npm install
	@cd services/storage && pip install -r requirements.txt
	@cd services/auth && go mod download
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

dev-api: ## Run API service in development mode
	@cd services/api && npm run dev

dev-dashboard: ## Run Dashboard in development mode
	@cd services/dashboard && npm run dev

dev-auth: ## Run Auth service in development mode
	@cd services/auth && go run cmd/main.go

shell-api: ## Open shell in API service container
	@docker-compose exec api-service sh

shell-auth: ## Open shell in Auth service container
	@docker-compose exec auth-service sh

shell-storage: ## Open shell in Storage service container
	@docker-compose exec storage-service bash

backup-db: ## Backup PostgreSQL database
	@echo "$(BLUE)Backing up database...$(NC)"
	@mkdir -p backups
	@docker-compose exec -T postgres pg_dump -U openbricks openbricks > backups/openbricks-$$(date +%Y%m%d-%H%M%S).sql
	@echo "$(GREEN)✓ Database backed up to backups/$(NC)"

restore-db: ## Restore PostgreSQL database (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: BACKUP_FILE not specified$(NC)"; \
		echo "Usage: make restore-db BACKUP_FILE=backups/openbricks-20231224-120000.sql"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring database from $(BACKUP_FILE)...$(NC)"
	@docker-compose exec -T postgres psql -U openbricks -d openbricks < $(BACKUP_FILE)
	@echo "$(GREEN)✓ Database restored$(NC)"

health-check: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(GREEN)API Gateway:$(NC)"
	@curl -s http://localhost:8080/health | jq . || echo "$(RED)✗ Not responding$(NC)"
	@echo ""
	@echo "$(GREEN)Auth Service:$(NC)"
	@curl -s http://localhost:8001/health | jq . || echo "$(RED)✗ Not responding$(NC)"
	@echo ""
	@echo "$(GREEN)API Service:$(NC)"
	@curl -s http://localhost:8000/health | jq . || echo "$(RED)✗ Not responding$(NC)"
	@echo ""
	@echo "$(GREEN)Storage Service:$(NC)"
	@curl -s http://localhost:8002/health | jq . || echo "$(RED)✗ Not responding$(NC)"

ports: ## Show all exposed ports
	@echo "$(BLUE)OpenBricks Service Ports:$(NC)"
	@echo ""
	@echo "$(GREEN)Frontend Services:$(NC)"
	@echo "  Dashboard:         http://localhost:3000"
	@echo "  Studio:            http://localhost:3001"
	@echo ""
	@echo "$(GREEN)Backend Services:$(NC)"
	@echo "  API Gateway:       http://localhost:8080"
	@echo "  Auth Service:      http://localhost:8001"
	@echo "  API Service:       http://localhost:8000"
	@echo "  Storage Service:   http://localhost:8002"
	@echo "  Query Engine:      http://localhost:8003"
	@echo ""
	@echo "$(GREEN)Data & Analytics:$(NC)"
	@echo "  PostgreSQL:        localhost:5432"
	@echo "  MinIO API:         http://localhost:9000"
	@echo "  MinIO Console:     http://localhost:9001"
	@echo "  Spark Master UI:   http://localhost:8081"
	@echo "  Notebooks:         http://localhost:8888"
	@echo "  Workspace:         http://localhost:8889"

env-check: ## Verify .env file exists and is properly configured
	@if [ ! -f .env ]; then \
		echo "$(RED)✗ .env file not found!$(NC)"; \
		echo "$(YELLOW)Run: cp .env.example .env$(NC)"; \
		exit 1; \
	else \
		echo "$(GREEN)✓ .env file exists$(NC)"; \
	fi

setup: env-check ## Complete setup: create .env, start services, run migrations
	@echo "$(BLUE)Setting up OpenBricks...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env from .env.example$(NC)"; \
		echo "$(YELLOW)⚠️  Remember to customize your .env file!$(NC)"; \
	fi
	@make up
	@sleep 30
	@make migrate
	@echo ""
	@echo "$(GREEN)✓✓✓ OpenBricks is ready! ✓✓✓$(NC)"
	@echo ""
	@make ports

quick: setup ## Alias for setup (quick start)
