FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json ./
COPY frontend/pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install --no-frozen-lockfile; fi
COPY frontend ./
RUN pnpm build

FROM ghcr.io/astral-sh/uv:alpine AS runtime
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen
COPY main.py ./
COPY backend ./backend
COPY --from=frontend-builder /frontend/dist ./static

ENV UV_LINK_MODE=copy
ENV PYTHONPATH=/app
ENV UV_ENVIRONMENT=production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3).status == 200 else 1)"
CMD ["uv", "run", "--no-sync", "main.py"]
