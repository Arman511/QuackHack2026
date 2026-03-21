import os
from pathlib import Path
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from backend.utils.config import (
    DATABASE_URL,
    DB_DIALECT,
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_PORT,
    DB_USER,
    SQLITE_DB_PATH,
)

load_dotenv()

logger = logging.getLogger(__name__)


if DATABASE_URL:
    URL_DATABASE = DATABASE_URL
    logger.info("Using DATABASE_URL from environment")
elif DB_DIALECT == "sqlite":
    if SQLITE_DB_PATH == ":memory:":
        URL_DATABASE = "sqlite:///:memory:"
        logger.info("Using in-memory sqlite database")
    else:
        sqlite_db_path = Path(SQLITE_DB_PATH).expanduser().resolve()
        sqlite_db_dir = sqlite_db_path.parent
        sqlite_db_dir.mkdir(parents=True, exist_ok=True)
        # make file writable, creating if necessary
        try:
            sqlite_db_path.touch(exist_ok=True)
            sqlite_db_path.chmod(0o666)
        except Exception:
            # ignore permission errors, container may handle separately
            pass
        URL_DATABASE = f"sqlite:///{sqlite_db_path}"
        logger.info("Using sqlite database at %s", sqlite_db_path)
else:
    URL_DATABASE = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    logger.info(
        "Using postgresql database host=%s port=%s name=%s", DB_HOST, DB_PORT, DB_NAME
    )

engine_kwargs = {}
if URL_DATABASE.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    logger.debug("Configured sqlite engine with check_same_thread=False")

engine = create_engine(URL_DATABASE, **engine_kwargs)
logger.info("Database engine initialized")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
