-- Create options table for 0DTE options data
CREATE TABLE IF NOT EXISTS options (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,                    -- e.g., "QQQ240122C00450"
  underlying_symbol TEXT NOT NULL,         -- e.g., "QQQ"
  option_type TEXT NOT NULL,               -- "CALL" or "PUT"
  strike_price NUMERIC(12, 4) NOT NULL,   -- Strike price
  expiration_date DATE NOT NULL,           -- Expiration date
  days_to_expiration INTEGER NOT NULL,    -- Days to expiration (0 for 0DTE)
  
  -- Option pricing data
  bid_price NUMERIC(12, 4),
  ask_price NUMERIC(12, 4),
  last_price NUMERIC(12, 4),
  mark_price NUMERIC(12, 4),
  
  -- Volume and open interest
  volume BIGINT,
  open_interest BIGINT,
  
  -- Greeks (if available)
  delta NUMERIC(12, 6),
  gamma NUMERIC(12, 6),
  theta NUMERIC(12, 6),
  vega NUMERIC(12, 6),
  rho NUMERIC(12, 6),
  
  -- Market data
  implied_volatility NUMERIC(12, 6),
  intrinsic_value NUMERIC(12, 4),
  time_value NUMERIC(12, 4),
  
  -- Metadata
  quote_time TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_options_underlying_symbol ON options(underlying_symbol);
CREATE INDEX idx_options_expiration_date ON options(expiration_date);
CREATE INDEX idx_options_days_to_expiration ON options(days_to_expiration);
CREATE INDEX idx_options_option_type ON options(option_type);
CREATE INDEX idx_options_strike_price ON options(strike_price);
CREATE INDEX idx_options_timestamp ON options(timestamp DESC);
CREATE INDEX idx_options_symbol ON options(symbol);

-- Composite index for common queries
CREATE INDEX idx_options_underlying_exp_dte ON options(underlying_symbol, expiration_date, days_to_expiration);

-- Enable Row Level Security
ALTER TABLE options ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON options
  FOR SELECT
  USING (true);

-- Create policy to allow service role insert
CREATE POLICY "Allow service role insert" ON options
  FOR INSERT
  WITH CHECK (true);
