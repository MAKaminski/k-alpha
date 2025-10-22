-- Create aggregated chart data table for efficient charting
-- This table stores 1-minute aggregated data to stay under 1000 row limit

CREATE TABLE IF NOT EXISTS chart_data (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Aggregated price data (1-minute buckets)
  open_price NUMERIC(15, 4) NOT NULL,
  high_price NUMERIC(15, 4) NOT NULL,
  low_price NUMERIC(15, 4) NOT NULL,
  close_price NUMERIC(15, 4) NOT NULL,
  volume BIGINT NOT NULL,
  
  -- Aggregated technical indicators
  sma9 NUMERIC(15, 4),
  session_vwap NUMERIC(15, 4),
  
  -- Time bucket info
  time_bucket TIMESTAMPTZ NOT NULL, -- Start of the 1-minute bucket
  session_date DATE NOT NULL,
  is_market_hours BOOLEAN NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_chart_data_symbol ON chart_data(symbol);
CREATE INDEX idx_chart_data_timestamp ON chart_data(timestamp DESC);
CREATE INDEX idx_chart_data_session_date ON chart_data(session_date);
CREATE INDEX idx_chart_data_symbol_session ON chart_data(symbol, session_date, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE chart_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access chart_data" ON chart_data
  FOR SELECT
  USING (true);

-- Create policy to allow service role insert
CREATE POLICY "Allow service role insert chart_data" ON chart_data
  FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE chart_data IS 'Aggregated 1-minute chart data for efficient charting under 1000 row limit';
COMMENT ON COLUMN chart_data.time_bucket IS 'Start of the 1-minute time bucket (e.g., 11:00:00, 11:01:00)';
COMMENT ON COLUMN chart_data.open_price IS 'Opening price for the 1-minute bucket';
COMMENT ON COLUMN chart_data.high_price IS 'Highest price in the 1-minute bucket';
COMMENT ON COLUMN chart_data.low_price IS 'Lowest price in the 1-minute bucket';
COMMENT ON COLUMN chart_data.close_price IS 'Closing price for the 1-minute bucket';
