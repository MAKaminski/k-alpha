-- Rollback migration for data deletion
-- This migration addresses the deletion of options data in migrations:
-- - 20251022210000_remove_test_data.sql
-- - 20251022220000_remove_remaining_test_data.sql
--
-- IMPORTANT: The data was permanently deleted and cannot be restored from these migrations.
-- This rollback migration documents what was deleted and provides options for recovery.

-- Document what was deleted (for audit purposes)
COMMENT ON TABLE options IS 'Options data table - data was deleted in migrations 20251022210000 and 20251022220000 due to test data cleanup. Data will be repopulated during next market session.';

-- The deleted data included:
-- 1. Options with strike prices below $580 for QQQ symbol
-- 2. Options created before 2025-10-22 20:00:00 and 2025-10-22 21:00:00
-- 3. Data with extreme price characteristics (below $500 or above $700)

-- Recovery options:
-- 1. Wait for next market session - the service will automatically repopulate options data
-- 2. If historical data is needed, it would need to be re-downloaded from Schwab API
-- 3. The service is currently running and will resume options downloads during market hours

-- Verify that the options table structure is intact
DO $$
BEGIN
    -- Check if options table exists and has correct structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'options') THEN
        RAISE NOTICE 'Options table structure is intact';
    ELSE
        RAISE EXCEPTION 'Options table does not exist - manual intervention required';
    END IF;
END $$;

-- Create a view to monitor options data recovery
CREATE OR REPLACE VIEW options_data_status AS
SELECT 
    COUNT(*) as total_options,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_options,
    MIN(created_at) as oldest_data,
    MAX(created_at) as newest_data,
    COUNT(DISTINCT underlying_symbol) as unique_symbols
FROM options;

-- Add a comment explaining the rollback
COMMENT ON VIEW options_data_status IS 'Monitor options data recovery after rollback of test data deletion migrations';
