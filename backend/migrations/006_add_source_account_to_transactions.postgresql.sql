ALTER TABLE IF EXISTS transactions
ADD COLUMN IF NOT EXISTS source_account_id BIGINT REFERENCES bank_accounts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_source_account_id
ON transactions (source_account_id);
