import hashlib
import json
import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine


MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
CHANGELOG_PATH = MIGRATIONS_DIR / "changelog.json"
logger = logging.getLogger(__name__)


def _log(message: str) -> None:
    # Print ensures visibility even when logging level is not configured for INFO.
    print(f"[migrations] {message}")
    logger.info(message)


def _detect_dialect(database_url: str) -> str:
    if database_url.startswith("sqlite"):
        return "sqlite"
    if database_url.startswith("postgresql"):
        return "postgresql"
    raise ValueError(f"Unsupported database URL for migrations: {database_url}")


def _split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    in_single_quote = False
    in_double_quote = False

    for char in sql:
        if char == "'" and not in_double_quote:
            in_single_quote = not in_single_quote
        elif char == '"' and not in_single_quote:
            in_double_quote = not in_double_quote

        if char == ";" and not in_single_quote and not in_double_quote:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
        else:
            current.append(char)

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)

    return statements


def _ensure_migrations_table(engine: Engine, dialect: str) -> None:
    if dialect == "sqlite":
        create_sql = """
        CREATE TABLE IF NOT EXISTS "SchemaMigrations" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_id TEXT NOT NULL UNIQUE,
            checksum TEXT NOT NULL,
            description TEXT,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    else:
        create_sql = """
        CREATE TABLE IF NOT EXISTS "SchemaMigrations" (
            id BIGSERIAL PRIMARY KEY,
            migration_id TEXT NOT NULL UNIQUE,
            checksum TEXT NOT NULL,
            description TEXT,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """

    with engine.begin() as conn:
        conn.exec_driver_sql(create_sql)


def _load_changelog() -> list[dict]:
    if not CHANGELOG_PATH.exists():
        raise FileNotFoundError(f"Migration changelog not found: {CHANGELOG_PATH}")

    payload = json.loads(CHANGELOG_PATH.read_text(encoding="utf-8"))
    migrations = payload.get("migrations", [])
    if not isinstance(migrations, list):
        raise ValueError("Invalid changelog format: 'migrations' must be a list")
    return migrations


def run_sql_migrations(engine: Engine, database_url: str) -> None:
    dialect = _detect_dialect(database_url)
    _ensure_migrations_table(engine, dialect)

    migrations = _load_changelog()
    _log(f"startup: checking {len(migrations)} changelog entries")

    with engine.begin() as conn:
        rows = conn.execute(
            text('SELECT migration_id, checksum FROM "SchemaMigrations"')
        ).fetchall()
        applied = {row.migration_id: row.checksum for row in rows}
    previously_applied = sorted(applied.keys())
    _log(f"previously applied: {previously_applied if previously_applied else 'none'}")

    for migration in migrations:
        migration_id = migration["id"]
        description = migration.get("description", "")
        script_name = migration.get(dialect)
        if not script_name:
            raise ValueError(
                f"Migration '{migration_id}' missing script for dialect '{dialect}'"
            )

        script_path = (MIGRATIONS_DIR / script_name).resolve()
        if not script_path.exists():
            raise FileNotFoundError(
                f"Migration script not found for '{migration_id}': {script_path}"
            )

        sql = script_path.read_text(encoding="utf-8")
        checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()

        if migration_id in applied:
            if applied[migration_id] != checksum:
                raise RuntimeError(
                    f"Checksum mismatch for migration '{migration_id}'. "
                    "Do not edit applied migrations; add a new migration instead."
                )

            _log(f"skipped: {migration_id} (already applied)")
            continue

        _log(f"running: {migration_id} - {description}")

        try:
            with engine.begin() as conn:
                for statement in _split_sql_statements(sql):
                    conn.exec_driver_sql(statement)

                conn.execute(
                    text(
                        'INSERT INTO "SchemaMigrations" (migration_id, checksum, description) '
                        "VALUES (:migration_id, :checksum, :description)"
                    ),
                    {
                        "migration_id": migration_id,
                        "checksum": checksum,
                        "description": description,
                    },
                )
            _log(f"completed: {migration_id}")
        except Exception as exc:
            _log(f"failed: {migration_id} - {exc}")
            logger.exception("Migration failed: %s", migration_id)
            raise

    _log("startup complete")
