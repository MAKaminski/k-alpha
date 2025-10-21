-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  bid_price NUMERIC(12, 4) NOT NULL,
  ask_price NUMERIC(12, 4) NOT NULL,
  last_price NUMERIC(12, 4) NOT NULL,
  volume BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on timestamp for efficient queries
CREATE INDEX idx_quotes_timestamp ON quotes(timestamp DESC);

-- Create index on symbol
CREATE INDEX idx_quotes_symbol ON quotes(symbol);

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON quotes
  FOR SELECT
  USING (true);

-- Create policy to allow service role insert
CREATE POLICY "Allow service role insert" ON quotes
  FOR INSERT
  WITH CHECK (true);

