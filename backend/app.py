from pathlib import Path
import logging

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException, status

from backend.controller.auth import router as auth_router
from backend.controller.bank import router as bank_router
from backend.controller.users import router as users_router
from backend.utils.database import URL_DATABASE, engine
from backend.utils.sql_migration import run_sql_migrations

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

logger = logging.getLogger(__name__)

app = FastAPI()


app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(bank_router, prefix="/api")

run_sql_migrations(engine, URL_DATABASE)
logger.info("Application startup complete and migrations checked")


@app.get("/api/health", status_code=status.HTTP_200_OK)
async def health_check():
    logger.debug("Health check endpoint invoked")
    return {"status": "healthy"}


base_dir = Path(__file__).resolve().parent.parent
candidates = [
    base_dir / "static",
    base_dir / "frontend" / "dist",
]
dist_dir = None
for p in candidates:
    try:
        p = p.resolve()
    except Exception:
        continue
    if p.exists():
        dist_dir = p
        break

if dist_dir and dist_dir.exists():
    logger.info("Static assets enabled from %s", dist_dir)
    app.mount("/static", StaticFiles(directory=dist_dir, html=True), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        if dist_dir:
            index_path = dist_dir / "index.html"
            logger.debug("Serving index candidate from %s", index_path)
            if index_path.exists():
                return FileResponse(index_path)
            else:
                logger.warning("Index file not found at %s", index_path)
                raise HTTPException(status_code=404, detail="Index file not found")

    @app.middleware("http")
    async def fallback_to_index(request, call_next):
        response = await call_next(request)
        try:
            status = response.status_code
        except Exception:
            return response

        if status == 404 and request.method in ("GET", "HEAD") and dist_dir:
            path = request.url.path or "/"

            excluded_prefixes = ("/api",)
            if any(path.startswith(p) for p in excluded_prefixes):
                return response

            if Path(path).suffix:
                file_path = dist_dir / path.lstrip("/")
                if file_path.exists():
                    return FileResponse(file_path)
                return response

            index_path = dist_dir / "index.html"
            if index_path.exists():
                logger.debug("Returning SPA index fallback for path=%s", path)
                return FileResponse(index_path)

        return response

else:
    logger.info("No static assets directory found; API-only mode")
