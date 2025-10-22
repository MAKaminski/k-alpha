-- Remove test data points with unrealistic prices
-- QQQ typically trades above $600, so prices around $500 are likely test data

-- Delete from indicators table
DELETE FROM indicators 
WHERE symbol = 'QQQ' 
  AND last_price < 580  -- Remove data with prices significantly below $600
  AND created_at < '2025-10-22 20:00:00'; -- Only remove old test data

-- Delete from quotes table if it exists and has similar test data
DELETE FROM quotes 
WHERE symbol = 'QQQ' 
  AND last_price < 580  -- Remove data with prices significantly below $600
  AND created_at < '2025-10-22 20:00:00'; -- Only remove old test data

-- Delete from options table if it exists and has similar test data
DELETE FROM options 
WHERE symbol = 'QQQ' 
  AND strike_price < 580  -- Remove options with strikes significantly below $600
  AND created_at < '2025-10-22 20:00:00'; -- Only remove old test data
