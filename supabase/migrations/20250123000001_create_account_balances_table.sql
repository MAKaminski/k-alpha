-- Create account_balances table to store account balance data
CREATE TABLE IF NOT EXISTS account_balances (
  id SERIAL PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  current_balance DECIMAL(15,2) NOT NULL,
  available_cash DECIMAL(15,2) NOT NULL,
  buying_power DECIMAL(15,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_account_balances_account_id ON account_balances(account_id);
CREATE INDEX idx_account_balances_timestamp ON account_balances(timestamp DESC);
CREATE INDEX idx_account_balances_account_timestamp ON account_balances(account_id, timestamp DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for dashboard display)
CREATE POLICY "Allow public read access to account balances" ON account_balances
  FOR SELECT USING (true);

-- Only allow service role to insert (backend only)
CREATE POLICY "Allow service role to insert account balances" ON account_balances
  FOR INSERT WITH CHECK (true);

-- Add comments
COMMENT ON TABLE account_balances IS 'Stores account balance data from Schwab API';
COMMENT ON COLUMN account_balances.current_balance IS 'Total account value';
COMMENT ON COLUMN account_balances.available_cash IS 'Cash available for trading';
COMMENT ON COLUMN account_balances.buying_power IS 'Total buying power available';
