COMPOSE := docker compose
COMPOSE_FILE := docker-compose.yml
COMPOSE_LOCAL_FILE := docker-compose.local.yml

ifeq ($(OS),Windows_NT)
NULL_DEVICE := NUL
HAS_PNPM := $(shell where pnpm >NUL 2>NUL && echo yes)
else
NULL_DEVICE := /dev/null
HAS_PNPM := $(shell command -v pnpm >/dev/null 2>&1 && echo yes)
endif

HAS_FRONTEND_PACKAGE := $(if $(wildcard frontend/package.json),yes,no)
HAS_TESTS_DIR := $(if $(wildcard tests),yes,no)
HAS_FRONTEND_TEST_SCRIPT := $(shell python -c "import json, pathlib; p = pathlib.Path('frontend/package.json'); print('yes' if p.exists() and 'test' in json.loads(p.read_text()).get('scripts', {}) else 'no')" 2>$(NULL_DEVICE))

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
ifeq ($(HAS_PNPM),yes)
	pnpm dlx prettier --write .
else
	@echo "pnpm not found; skipping Prettier format"
endif

lint:
	uvx black --check .
ifeq ($(HAS_PNPM),yes)
ifeq ($(HAS_FRONTEND_PACKAGE),yes)
	pnpm --dir frontend lint
else
	@echo "frontend/package.json not found; skipping frontend lint"
endif
	pnpm dlx prettier --check .
else
	@echo "pnpm not found; skipping Prettier lint"
endif

test:
ifeq ($(HAS_TESTS_DIR),yes)
	uv run python -m pytest
else
	@echo "No Python tests found yet (expected tests/ directory)."
endif
ifeq ($(HAS_FRONTEND_PACKAGE),yes)
ifeq ($(HAS_FRONTEND_TEST_SCRIPT),yes)
	pnpm --dir frontend test
else
	@echo "No frontend tests yet (frontend/package.json test script not found)."
endif
else
	@echo "No frontend tests yet (frontend/package.json test script not found)."
endif

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

down-local:
	$(COMPOSE) -f $(COMPOSE_LOCAL_FILE) down
