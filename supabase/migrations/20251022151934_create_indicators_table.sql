-- Create technical indicators table for QQQ
CREATE TABLE IF NOT EXISTS indicators (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,                    -- e.g., "QQQ"
  timestamp TIMESTAMPTZ NOT NULL,          -- Quote timestamp
  
  -- Price data
  last_price NUMERIC(12, 4) NOT NULL,      -- Current price
  volume BIGINT NOT NULL,                  -- Current volume
  
  -- Technical Indicators
  sma9 NUMERIC(12, 4),                     -- 9-period Simple Moving Average
  session_vwap NUMERIC(12, 4),             -- Session Volume Weighted Average Price
  
  -- Session tracking
  session_date DATE NOT NULL,              -- Trading session date
  is_market_hours BOOLEAN NOT NULL,        -- Whether this tick is during market hours
  session_start_time TIMESTAMPTZ,          -- When the trading session started
  session_volume BIGINT DEFAULT 0,         -- Cumulative volume for the session
  session_pv_sum NUMERIC(20, 8) DEFAULT 0, -- Cumulative price*volume sum for VWAP
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_indicators_symbol ON indicators(symbol);
CREATE INDEX idx_indicators_timestamp ON indicators(timestamp DESC);
CREATE INDEX idx_indicators_session_date ON indicators(session_date);
CREATE INDEX idx_indicators_is_market_hours ON indicators(is_market_hours);
CREATE INDEX idx_indicators_symbol_timestamp ON indicators(symbol, timestamp DESC);

-- Composite index for common queries
CREATE INDEX idx_indicators_symbol_session ON indicators(symbol, session_date, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON indicators
  FOR SELECT
  USING (true);

-- Create policy to allow service role insert
CREATE POLICY "Allow service role insert" ON indicators
  FOR INSERT
  WITH CHECK (true);
