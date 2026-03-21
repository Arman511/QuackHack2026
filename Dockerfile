from ghcr.io/astral-sh/uv:alpine AS builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

FROM ghcr.io/astral-sh/uv:alpine AS runtime
WORKDIR /app
COPY --from=builder /app /app
COPY main.py ./
COPY backend ./backend
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3).status == 200 else 1)"
CMD ["uv", "run", "main.py"]
