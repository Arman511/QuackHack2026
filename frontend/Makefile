PNPM ?= pnpm

.PHONY: install dev build build-dev test cover lint preview typecheck

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev

build:
	$(PNPM) build

build-dev:
	$(PNPM) build:dev

test:
	$(PNPM) test

cover:
	$(PNPM) test -- --coverage

lint:
	$(PNPM) lint

preview:
	$(PNPM) preview

typecheck:
	$(PNPM) exec tsc --noEmit
