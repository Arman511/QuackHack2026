SHELL := /bin/sh

COMPOSE := docker compose
COMPOSE_FILE := docker-compose.yml
COMPOSE_LOCAL_FILE := docker-compose.local.yml

.PHONY: serve serve-local local build format lint test down down-local

serve:
	$(COMPOSE) -f $(COMPOSE_FILE) up --build

serve-local:
	$(COMPOSE) -f $(COMPOSE_LOCAL_FILE) up --build

local: serve-local

build:
	$(COMPOSE) -f $(COMPOSE_FILE) build

format:
	uvx black .
	@if command -v pnpm >/dev/null 2>&1; then \
		pnpm dlx prettier --write .; \
	else \
		echo "pnpm not found; skipping Prettier format"; \
	fi

lint:
	uvx black --check .
	@if command -v pnpm >/dev/null 2>&1; then \
		pnpm dlx prettier --check .; \
	else \
		echo "pnpm not found; skipping Prettier lint"; \
	fi

test:
	@if [ -d tests ]; then \
		uv run python -m pytest; \
	else \
		echo "No Python tests found yet (expected tests/ directory)."; \
	fi
	@if [ -f package.json ]; then \
		npm test; \
	else \
		echo "No frontend tests yet (package.json not found)."; \
	fi

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

down-local:
	$(COMPOSE) -f $(COMPOSE_LOCAL_FILE) down
