-- Create a view for options chart data
-- This view transforms options data into a format suitable for charting
-- Each row represents a time point with option prices for different strikes/types

CREATE OR REPLACE VIEW options_chart_data AS
WITH option_prices AS (
  SELECT 
    timestamp,
    DATE_TRUNC('minute', timestamp) as time_bucket,
    underlying_symbol,
    option_type,
    strike_price,
    -- Use the best available price (last_price > mark_price > bid_price)
    COALESCE(
      last_price, 
      mark_price, 
      (bid_price + ask_price) / 2,
      bid_price,
      ask_price
    ) as option_price,
    volume,
    open_interest,
    delta,
    gamma,
    theta,
    vega,
    implied_volatility
  FROM options
  WHERE underlying_symbol = 'QQQ'
    AND days_to_expiration = 0  -- Only 0DTE options
    AND timestamp >= CURRENT_DATE  -- Only today's data
    AND COALESCE(
      last_price, 
      mark_price, 
      (bid_price + ask_price) / 2,
      bid_price,
      ask_price
    ) > 0  -- Only options with valid prices
),
time_series AS (
  SELECT DISTINCT time_bucket
  FROM option_prices
  ORDER BY time_bucket
),
strike_series AS (
  SELECT DISTINCT 
    option_type,
    strike_price,
    -- Create a series key for easy identification
    CONCAT(option_type, '_', strike_price) as series_key
  FROM option_prices
  ORDER BY option_type, strike_price
)
SELECT 
  ts.time_bucket as timestamp,
  ts.time_bucket::time as time_label,
  ss.series_key,
  ss.option_type,
  ss.strike_price,
  COALESCE(op.option_price, 0) as price,
  COALESCE(op.volume, 0) as volume,
  COALESCE(op.open_interest, 0) as open_interest,
  COALESCE(op.delta, 0) as delta,
  COALESCE(op.gamma, 0) as gamma,
  COALESCE(op.theta, 0) as theta,
  COALESCE(op.vega, 0) as vega,
  COALESCE(op.implied_volatility, 0) as implied_volatility
FROM time_series ts
CROSS JOIN strike_series ss
LEFT JOIN option_prices op ON (
  ts.time_bucket = op.time_bucket 
  AND ss.option_type = op.option_type 
  AND ss.strike_price = op.strike_price
)
ORDER BY ts.time_bucket, ss.option_type, ss.strike_price;

-- Create an index on the underlying options table for better performance
CREATE INDEX IF NOT EXISTS idx_options_chart_query 
ON options(underlying_symbol, days_to_expiration, timestamp, option_type, strike_price);

-- Add a comment explaining the view
COMMENT ON VIEW options_chart_data IS 'Chart-ready options data with time series and strike series cross-joined for consistent charting';
