-- Add last_total_volume field to indicators table for proper VWAP calculation
-- This field stores the last total volume from the API to calculate incremental volume

ALTER TABLE public.indicators 
ADD COLUMN last_total_volume NUMERIC(20, 0) DEFAULT 0;

-- Add index for better query performance
CREATE INDEX idx_indicators_last_total_volume ON public.indicators (last_total_volume);

-- Update existing records to have last_total_volume = 0
UPDATE public.indicators 
SET last_total_volume = 0 
WHERE last_total_volume IS NULL;

