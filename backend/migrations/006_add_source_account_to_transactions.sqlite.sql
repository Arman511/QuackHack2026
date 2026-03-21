ALTER TABLE transactions ADD COLUMN source_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_source_account_id
ON transactions (source_account_id);
