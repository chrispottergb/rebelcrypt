.PHONY: help install build test lint typecheck clean dev docker-build docker-up docker-down k8s-deploy k8s-delete migrate seed

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

build: ## Build all packages
	npm run build

test: ## Run tests
	npm test

lint: ## Run linter
	npm run lint

typecheck: ## Run TypeScript type checking
	npm run typecheck

clean: ## Clean build artifacts
	find packages -name "dist" -type d -exec rm -rf {} +
	find packages -name "node_modules" -type d -exec rm -rf {} +
	rm -rf node_modules

dev: ## Start development servers
	npm run dev

docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start Docker containers
	docker-compose up -d

docker-down: ## Stop Docker containers
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

k8s-deploy: ## Deploy to Kubernetes
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/postgres.yaml
	kubectl apply -f k8s/redis.yaml
	kubectl apply -f k8s/api.yaml
	kubectl apply -f k8s/ingress.yaml

k8s-delete: ## Delete from Kubernetes
	kubectl delete -f k8s/

k8s-status: ## Check Kubernetes deployment status
	kubectl get all -n music-ai-platform

migrate: ## Run database migrations
	npm run migrate

seed: ## Seed database with sample data
	npm run seed

format: ## Format code
	npm run format

security-audit: ## Run security audit
	npm audit

update-deps: ## Update dependencies
	npm update

ci: lint typecheck test build ## Run CI pipeline locally
