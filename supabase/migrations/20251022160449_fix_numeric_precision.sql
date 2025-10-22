-- Fix numeric precision issues in indicators table
-- Increase precision for session_pv_sum to handle large volume values

ALTER TABLE indicators 
ALTER COLUMN session_pv_sum TYPE NUMERIC(30, 8);

-- Also ensure other numeric fields have sufficient precision
ALTER TABLE indicators 
ALTER COLUMN last_price TYPE NUMERIC(15, 4);

ALTER TABLE indicators 
ALTER COLUMN sma9 TYPE NUMERIC(15, 4);

ALTER TABLE indicators 
ALTER COLUMN session_vwap TYPE NUMERIC(15, 4);

-- Update options table numeric fields as well
ALTER TABLE options 
ALTER COLUMN strike_price TYPE NUMERIC(15, 4);

ALTER TABLE options 
ALTER COLUMN bid_price TYPE NUMERIC(15, 4);

ALTER TABLE options 
ALTER COLUMN ask_price TYPE NUMERIC(15, 4);

ALTER TABLE options 
ALTER COLUMN last_price TYPE NUMERIC(15, 4);

ALTER TABLE options 
ALTER COLUMN mark_price TYPE NUMERIC(15, 4);

ALTER TABLE options 
ALTER COLUMN delta TYPE NUMERIC(20, 8);

ALTER TABLE options 
ALTER COLUMN gamma TYPE NUMERIC(20, 8);

ALTER TABLE options 
ALTER COLUMN theta TYPE NUMERIC(20, 8);

ALTER TABLE options 
ALTER COLUMN vega TYPE NUMERIC(20, 8);

ALTER TABLE options 
ALTER COLUMN rho TYPE NUMERIC(20, 8);

ALTER TABLE options 
ALTER COLUMN implied_volatility TYPE NUMERIC(20, 8);

ALTER TABLE options 
ALTER COLUMN intrinsic_value TYPE NUMERIC(15, 4);

ALTER TABLE options 
ALTER COLUMN time_value TYPE NUMERIC(15, 4);
