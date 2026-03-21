-- SQLite doesn't have native ENUM types, so we use TEXT with CHECK constraints

-- Add type column to users table
-- Note: SQLite doesn't support CHECK in ALTER TABLE, so we add it without constraint validation
ALTER TABLE users ADD COLUMN type TEXT NOT NULL DEFAULT 'USER';

-- BankAccounts table (SQLite version)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    bank_account_id TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(8)))),
    account_number TEXT NOT NULL,
    sort_code TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_number, sort_code),
    CHECK (type IN ('CURRENT', 'SAVING'))
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_account_id ON bank_accounts (bank_account_id);

-- ImpulseZones table
CREATE TABLE IF NOT EXISTS impulse_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PossibleImpulseZones table
CREATE TABLE IF NOT EXISTS possible_impulse_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserImpulses table (junction table)
CREATE TABLE IF NOT EXISTS user_impulses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    impulse_id INTEGER NOT NULL REFERENCES impulse_zones (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, impulse_id)
);

CREATE INDEX IF NOT EXISTS idx_user_impulses_user_id ON user_impulses (user_id);

CREATE INDEX IF NOT EXISTS idx_user_impulses_impulse_id ON user_impulses (impulse_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    merchant TEXT NOT NULL,
    impulse_zone_id INTEGER REFERENCES impulse_zones (id) ON DELETE SET NULL,
    possible_impulse_zone_id INTEGER REFERENCES possible_impulse_zones (id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp);

CREATE INDEX IF NOT EXISTS idx_transactions_impulse_zone_id ON transactions (impulse_zone_id);

CREATE INDEX IF NOT EXISTS idx_transactions_possible_impulse_zone_id ON transactions (possible_impulse_zone_id);

-- UserMetadata table
CREATE TABLE IF NOT EXISTS user_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    goal TEXT,
    bank_account_id INTEGER REFERENCES bank_accounts (id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_metadata_user_id ON user_metadata (user_id);
