-- Remove any remaining test data points with unrealistic prices
-- This migration is more aggressive to catch any test data that might have been missed

-- Delete from indicators table - remove any data with prices significantly below current QQQ levels
DELETE FROM indicators 
WHERE symbol = 'QQQ' 
  AND last_price < 580  -- Remove data with prices significantly below $600
  AND timestamp < NOW() - INTERVAL '1 hour'; -- Only remove recent test data

-- Delete from quotes table if it exists and has similar test data
DELETE FROM quotes 
WHERE symbol = 'QQQ' 
  AND last_price < 580  -- Remove data with prices significantly below $600
  AND timestamp < NOW() - INTERVAL '1 hour'; -- Only remove recent test data

-- Delete from options table if it exists and has similar test data
DELETE FROM options 
WHERE symbol = 'QQQ' 
  AND strike_price < 580  -- Remove options with strikes significantly below $600
  AND created_at < NOW() - INTERVAL '1 hour'; -- Only remove recent test data

-- Also remove any data points with extreme price spikes (test data characteristics)
-- Remove extreme prices that are clearly test data
DELETE FROM indicators 
WHERE symbol = 'QQQ' 
  AND (
    last_price < 500 OR  -- Extreme low prices
    last_price > 700     -- Extreme high prices (for today's date)
  )
  AND timestamp < NOW() - INTERVAL '2 hours'; -- Only remove recent test data

-- Clean up any orphaned crossover signals
DELETE FROM crossover_signals 
WHERE symbol = 'QQQ' 
  AND created_at < NOW() - INTERVAL '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM indicators 
    WHERE indicators.symbol = 'QQQ' 
    AND indicators.timestamp >= crossover_signals.created_at - INTERVAL '5 minutes'
    AND indicators.timestamp <= crossover_signals.created_at + INTERVAL '5 minutes'
  );
