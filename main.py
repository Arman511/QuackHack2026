import logging

import uvicorn
from backend.app import app
from fastapi.routing import APIRoute

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting API server bootstrap")
    for route in app.routes:
        if isinstance(route, APIRoute):
            logger.info(
                "Route registered: path=%s methods=%s name=%s endpoint=%s",
                route.path,
                sorted(route.methods),
                route.name,
                route.endpoint.__name__,
            )

    logger.info("Launching uvicorn host=0.0.0.0 port=8000 reload=True")
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
