-- Create ENUM types for PostgreSQL
CREATE TYPE user_type_enum AS ENUM ('ADMIN', 'USER');

CREATE TYPE account_type_enum AS ENUM ('CURRENT', 'SAVING');

-- Add type column to users table
ALTER TABLE IF EXISTS users
ADD COLUMN type user_type_enum NOT NULL DEFAULT 'USER';

-- BankAccounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL DEFAULT gen_random_uuid (),
    account_number TEXT NOT NULL,
    sort_code TEXT NOT NULL,
    name TEXT NOT NULL,
    provider bank_provider_enum NOT NULL,
    type TEXT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_number, sort_code)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_account_id ON bank_accounts (bank_account_id);

-- ImpulseZones table
CREATE TABLE IF NOT EXISTS impulse_zones (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PossibleImpulseZones table
CREATE TABLE IF NOT EXISTS possible_impulse_zones (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserImpulses table (junction table)
CREATE TABLE IF NOT EXISTS user_impulses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    impulse_id BIGINT NOT NULL REFERENCES impulse_zones (id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, impulse_id)
);

CREATE INDEX IF NOT EXISTS idx_user_impulses_user_id ON user_impulses (user_id);

CREATE INDEX IF NOT EXISTS idx_user_impulses_impulse_id ON user_impulses (impulse_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    merchant TEXT NOT NULL,
    impulse_zone_id BIGINT REFERENCES impulse_zones (id) ON DELETE SET NULL,
    possible_impulse_zone_id BIGINT REFERENCES possible_impulse_zones (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions (timestamp);

CREATE INDEX IF NOT EXISTS idx_transactions_impulse_zone_id ON transactions (impulse_zone_id);

CREATE INDEX IF NOT EXISTS idx_transactions_possible_impulse_zone_id ON transactions (possible_impulse_zone_id);

-- UserMetadata table
CREATE TABLE IF NOT EXISTS user_metadata (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    goal TEXT,
    bank_account_id BIGINT REFERENCES bank_accounts (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_metadata_user_id ON user_metadata (user_id);
