CREATE TABLE IF NOT EXISTS transaction_punishments (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_amount INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_punishments_user_id
    ON transaction_punishments(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_punishments_timestamp
    ON transaction_punishments(timestamp);
