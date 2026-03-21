PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS possible_impulse_zones_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);

INSERT INTO
    possible_impulse_zones_new (id, user_id, name, created_at)
SELECT id, NULL, name, created_at
FROM possible_impulse_zones;

DROP TABLE possible_impulse_zones;

ALTER TABLE possible_impulse_zones_new
RENAME TO possible_impulse_zones;

CREATE INDEX IF NOT EXISTS idx_possible_impulse_zones_user_id ON possible_impulse_zones (user_id);

PRAGMA foreign_keys = ON;
