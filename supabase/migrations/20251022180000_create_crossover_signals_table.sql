-- Create crossover signals table to track SMA9/Session VWAP crossovers
CREATE TABLE IF NOT EXISTS crossover_signals (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  last_price NUMERIC(15, 4) NOT NULL,
  sma9 NUMERIC(15, 4) NOT NULL,
  session_vwap NUMERIC(15, 4) NOT NULL,
  signal_type TEXT NOT NULL, -- 'BULLISH' or 'BEARISH'
  crossover_direction TEXT NOT NULL, -- 'UP' (SMA9 crosses above VWAP) or 'DOWN' (SMA9 crosses below VWAP)
  price_at_crossover NUMERIC(15, 4) NOT NULL,
  sma9_at_crossover NUMERIC(15, 4) NOT NULL,
  vwap_at_crossover NUMERIC(15, 4) NOT NULL,
  previous_sma9 NUMERIC(15, 4), -- Previous SMA9 value for comparison
  previous_vwap NUMERIC(15, 4), -- Previous VWAP value for comparison
  is_market_hours BOOLEAN NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_crossover_signals_symbol_timestamp ON crossover_signals(symbol, timestamp DESC);
CREATE INDEX idx_crossover_signals_signal_type ON crossover_signals(signal_type);
CREATE INDEX idx_crossover_signals_session_date ON crossover_signals(session_date);
CREATE INDEX idx_crossover_signals_crossover_direction ON crossover_signals(crossover_direction);

-- Enable Row Level Security
ALTER TABLE crossover_signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access crossover signals" ON crossover_signals FOR SELECT USING (true);
CREATE POLICY "Allow service role insert crossover signals" ON crossover_signals FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE crossover_signals IS 'Tracks SMA9/Session VWAP crossover signals for trading decisions';
COMMENT ON COLUMN crossover_signals.signal_type IS 'BULLISH when SMA9 crosses above VWAP, BEARISH when SMA9 crosses below VWAP';
COMMENT ON COLUMN crossover_signals.crossover_direction IS 'UP when SMA9 crosses above VWAP, DOWN when SMA9 crosses below VWAP';
COMMENT ON COLUMN crossover_signals.price_at_crossover IS 'The price at the exact moment of crossover';
COMMENT ON COLUMN crossover_signals.sma9_at_crossover IS 'SMA9 value at the exact moment of crossover';
COMMENT ON COLUMN crossover_signals.vwap_at_crossover IS 'Session VWAP value at the exact moment of crossover';
COMMENT ON COLUMN crossover_signals.previous_sma9 IS 'Previous SMA9 value for comparison';
COMMENT ON COLUMN crossover_signals.previous_vwap IS 'Previous VWAP value for comparison';
