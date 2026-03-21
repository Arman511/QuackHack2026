import json

import pytest
from sqlalchemy import create_engine, text

from backend.utils import sql_migration


def test_detect_dialect_supports_sqlite_and_postgresql() -> None:
    assert sql_migration._detect_dialect("sqlite:///tmp.db") == "sqlite"
    assert (
        sql_migration._detect_dialect("postgresql://user:pw@localhost/db")
        == "postgresql"
    )


@pytest.mark.parametrize("url", ["mysql://localhost/db", "http://example.com"])
def test_detect_dialect_rejects_unsupported_urls(url: str) -> None:
    with pytest.raises(ValueError, match="Unsupported database URL"):
        sql_migration._detect_dialect(url)


def test_split_sql_statements_handles_semicolons_in_quotes() -> None:
    sql = """
    INSERT INTO demo (txt) VALUES ('a; b');
    INSERT INTO demo (txt) VALUES ("c; d");
    UPDATE demo SET txt = 'z';
    """

    statements = sql_migration._split_sql_statements(sql)

    assert statements == [
        "INSERT INTO demo (txt) VALUES ('a; b')",
        'INSERT INTO demo (txt) VALUES ("c; d")',
        "UPDATE demo SET txt = 'z'",
    ]


def test_run_sql_migrations_applies_scripts_and_records_checksums(
    tmp_path, monkeypatch
) -> None:
    changelog_path = tmp_path / "changelog.json"
    migration_file = tmp_path / "001_create_demo.sqlite.sql"

    migration_file.write_text(
        """
        CREATE TABLE demo (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        INSERT INTO demo (name) VALUES ('alice');
        """,
        encoding="utf-8",
    )
    changelog_path.write_text(
        json.dumps(
            {
                "migrations": [
                    {
                        "id": "001",
                        "description": "create demo table",
                        "sqlite": migration_file.name,
                        "postgresql": "001_create_demo.postgresql.sql",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr(sql_migration, "MIGRATIONS_DIR", tmp_path)
    monkeypatch.setattr(sql_migration, "CHANGELOG_PATH", changelog_path)

    engine = create_engine(f"sqlite:///{tmp_path / 'app.db'}")

    sql_migration.run_sql_migrations(engine, "sqlite:///app.db")

    with engine.begin() as conn:
        created = conn.execute(text("SELECT name FROM demo")).fetchall()
        applied = conn.execute(
            text('SELECT migration_id FROM "SchemaMigrations" ORDER BY migration_id')
        ).fetchall()

    assert created == [("alice",)]
    assert applied == [("001",)]
    engine.dispose()


def test_run_sql_migrations_raises_on_checksum_mismatch(tmp_path, monkeypatch) -> None:
    changelog_path = tmp_path / "changelog.json"
    migration_file = tmp_path / "001_demo.sqlite.sql"

    migration_file.write_text(
        "CREATE TABLE demo (id INTEGER PRIMARY KEY);", encoding="utf-8"
    )
    changelog_path.write_text(
        json.dumps(
            {
                "migrations": [
                    {
                        "id": "001",
                        "description": "create demo table",
                        "sqlite": migration_file.name,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr(sql_migration, "MIGRATIONS_DIR", tmp_path)
    monkeypatch.setattr(sql_migration, "CHANGELOG_PATH", changelog_path)

    db_path = tmp_path / "app.db"
    engine = create_engine(f"sqlite:///{db_path}")

    sql_migration.run_sql_migrations(engine, f"sqlite:///{db_path}")

    # Simulate an accidental edit to an already applied migration.
    migration_file.write_text(
        "CREATE TABLE demo (id INTEGER PRIMARY KEY, name TEXT);", encoding="utf-8"
    )

    with pytest.raises(RuntimeError, match="Checksum mismatch"):
        sql_migration.run_sql_migrations(engine, f"sqlite:///{db_path}")

    engine.dispose()
