.PHONY: help install build test lint typecheck clean dev docker-build docker-up docker-down k8s-deploy k8s-delete migrate seed

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	yarn install
build: ## Build all packages
	yarn build
test: ## Run tests
	yarn test
lint: ## Run linter
	yarn lint
typecheck: ## Run TypeScript type checking
	yarn typecheck
clean: ## Clean build artifacts
	find packages -name "dist" -type d -exec rm -rf {} +
	find packages -name "node_modules" -type d -exec rm -rf {} +
	rm -rf node_modules

dev: ## Start development servers
	yarn dev
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
	yarn migrate
seed: ## Seed database with sample data
	yarn seed
format: ## Format code
	yarn format
security-audit: ## Run security audit
	yarn audit
update-deps: ## Update dependencies
	yarn upgrade
ci: lint typecheck test build ## Run CI pipeline locally
