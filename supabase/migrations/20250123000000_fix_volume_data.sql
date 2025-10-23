-- Fix volume data to be incremental instead of cumulative
-- This migration calculates incremental volume from existing cumulative data

-- First, let's see what we're working with
-- SELECT symbol, timestamp, volume FROM quotes ORDER BY timestamp LIMIT 10;

-- Create a temporary table with incremental volume calculations
CREATE TEMP TABLE volume_fixes AS
WITH ordered_quotes AS (
  SELECT 
    id,
    symbol,
    timestamp,
    volume as cumulative_volume,
    LAG(volume) OVER (PARTITION BY symbol ORDER BY timestamp) as prev_cumulative_volume
  FROM quotes
  ORDER BY symbol, timestamp
)
SELECT 
  id,
  symbol,
  timestamp,
  cumulative_volume,
  prev_cumulative_volume,
  CASE 
    WHEN prev_cumulative_volume IS NULL THEN cumulative_volume  -- First record of the day
    WHEN cumulative_volume >= prev_cumulative_volume THEN cumulative_volume - prev_cumulative_volume
    ELSE 0  -- Volume decreased (unusual, set to 0)
  END as incremental_volume
FROM ordered_quotes;

-- Update quotes table with incremental volume
UPDATE quotes 
SET volume = vf.incremental_volume
FROM volume_fixes vf
WHERE quotes.id = vf.id;

-- Update indicators table with incremental volume
UPDATE indicators 
SET volume = vf.incremental_volume
FROM volume_fixes vf
WHERE indicators.symbol = vf.symbol 
  AND indicators.timestamp = vf.timestamp;

-- Clean up
DROP TABLE volume_fixes;

-- Add a comment to document this change
COMMENT ON COLUMN quotes.volume IS 'Incremental volume for this time period (not cumulative)';
COMMENT ON COLUMN indicators.volume IS 'Incremental volume for this time period (not cumulative)';
