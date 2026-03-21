# QuackHack2026

Full-stack app with:

- Python backend using uv
- Frontend managed with pnpm
- Optional Docker workflows via Makefile

## Prerequisites

- Python 3.14+
- uv
- Node.js 20+
- pnpm

## Backend Setup (uv)

Install backend dependencies and create a virtual environment:

```bash
uv sync
```

Run the backend locally:

```bash
uv run main.py
```

Backend will run on http://localhost:8000.

## Frontend Setup (pnpm)

Install frontend dependencies:

```bash
pnpm --dir frontend install
```

Run frontend locally:

```bash
pnpm --dir frontend dev
```

## Common Make Targets

Run formatter:

```bash
make format
```

Run lint checks:

```bash
make lint
```

Run tests:

```bash
make test
```

Run Docker stack:

```bash
make serve
```

Run local Docker stack:

```bash
make local
```

## Git Hooks

Install repository hooks so format checks run before commit:

```bash
make install-hooks
```
