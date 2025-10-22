-- Create function to aggregate indicators data into chart_data
-- This function will be called periodically to maintain aggregated data

CREATE OR REPLACE FUNCTION aggregate_indicators_to_chart_data()
RETURNS void AS $$
BEGIN
  -- Insert aggregated data for the current session
  INSERT INTO chart_data (
    symbol,
    timestamp,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    sma9,
    session_vwap,
    time_bucket,
    session_date,
    is_market_hours
  )
  SELECT 
    symbol,
    time_bucket + INTERVAL '1 minute' AS timestamp, -- End of bucket
    FIRST_VALUE(last_price) OVER (PARTITION BY symbol, time_bucket ORDER BY timestamp) AS open_price,
    MAX(last_price) AS high_price,
    MIN(last_price) AS low_price,
    LAST_VALUE(last_price) OVER (PARTITION BY symbol, time_bucket ORDER BY timestamp) AS close_price,
    SUM(volume) AS volume,
    AVG(sma9) AS sma9,
    AVG(session_vwap) AS session_vwap,
    time_bucket,
    session_date,
    BOOL_OR(is_market_hours) AS is_market_hours
  FROM (
    SELECT 
      symbol,
      last_price,
      volume,
      sma9,
      session_vwap,
      session_date,
      is_market_hours,
      timestamp,
      DATE_TRUNC('minute', timestamp) AS time_bucket
    FROM indicators
    WHERE symbol = 'QQQ'
      AND session_date = CURRENT_DATE
      AND timestamp > COALESCE(
        (SELECT MAX(timestamp) FROM chart_data WHERE symbol = 'QQQ' AND session_date = CURRENT_DATE),
        CURRENT_DATE::timestamp
      )
  ) aggregated
  GROUP BY symbol, time_bucket, session_date
  ON CONFLICT (symbol, time_bucket) DO UPDATE SET
    open_price = EXCLUDED.open_price,
    high_price = EXCLUDED.high_price,
    low_price = EXCLUDED.low_price,
    close_price = EXCLUDED.close_price,
    volume = EXCLUDED.volume,
    sma9 = EXCLUDED.sma9,
    session_vwap = EXCLUDED.session_vwap,
    timestamp = EXCLUDED.timestamp,
    is_market_hours = EXCLUDED.is_market_hours;
END;
$$ LANGUAGE plpgsql;

-- Create unique constraint to prevent duplicates
ALTER TABLE chart_data ADD CONSTRAINT unique_symbol_time_bucket 
UNIQUE (symbol, time_bucket);

-- Add comment for documentation
COMMENT ON FUNCTION aggregate_indicators_to_chart_data() IS 'Aggregates raw indicators data into 1-minute chart_data buckets';
