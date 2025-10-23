-- Create test account balances table for in-house paper trading
-- This table will store simulated account balances for testing purposes

CREATE TABLE IF NOT EXISTS test_account_balances (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL DEFAULT 'TEST-ACCOUNT-001',
  account_type TEXT NOT NULL DEFAULT 'MARGIN',
  account_number TEXT NOT NULL DEFAULT 'TEST-001',
  current_balance NUMERIC(15, 4) NOT NULL DEFAULT 0,
  available_cash NUMERIC(15, 4) NOT NULL DEFAULT 0,
  buying_power NUMERIC(15, 4) NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create test transactions table to track funding and trades
CREATE TABLE IF NOT EXISTS test_transactions (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL DEFAULT 'TEST-ACCOUNT-001',
  transaction_type TEXT NOT NULL, -- 'FUNDING', 'TRADE', 'WITHDRAWAL', etc.
  amount NUMERIC(15, 4) NOT NULL,
  description TEXT,
  balance_before NUMERIC(15, 4) NOT NULL,
  balance_after NUMERIC(15, 4) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_test_account_balances_account_id ON test_account_balances(account_id);
CREATE INDEX idx_test_account_balances_timestamp ON test_account_balances(timestamp DESC);
CREATE INDEX idx_test_transactions_account_id ON test_transactions(account_id);
CREATE INDEX idx_test_transactions_timestamp ON test_transactions(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE test_account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Allow public read access test account balances" ON test_account_balances FOR SELECT USING (true);
CREATE POLICY "Allow service role insert test account balances" ON test_account_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update test account balances" ON test_account_balances FOR UPDATE WITH CHECK (true);

CREATE POLICY "Allow public read access test transactions" ON test_transactions FOR SELECT USING (true);
CREATE POLICY "Allow service role insert test transactions" ON test_transactions FOR INSERT WITH CHECK (true);

-- Insert initial $100K funding transaction
INSERT INTO test_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  balance_before,
  balance_after,
  timestamp
) VALUES (
  'TEST-ACCOUNT-001',
  'FUNDING',
  100000.00,
  'Initial paper trading account funding',
  0.00,
  100000.00,
  NOW()
);

-- Insert initial test account balance
INSERT INTO test_account_balances (
  account_id,
  account_type,
  account_number,
  current_balance,
  available_cash,
  buying_power,
  timestamp
) VALUES (
  'TEST-ACCOUNT-001',
  'MARGIN',
  'TEST-001',
  100000.00,
  100000.00,
  100000.00,
  NOW()
);

-- Add a comment explaining the tables
COMMENT ON TABLE test_account_balances IS 'In-house paper trading account balances for testing purposes';
COMMENT ON TABLE test_transactions IS 'Transaction history for in-house paper trading account';
