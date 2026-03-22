CREATE TABLE IF NOT EXISTS transaction_punishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transaction_punishments_user_id
    ON transaction_punishments(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_punishments_timestamp
    ON transaction_punishments(timestamp);
