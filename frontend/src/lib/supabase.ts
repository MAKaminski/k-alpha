import { createClient } from '@supabase/supabase-js';

const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabase_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabase_url, supabase_key);

export interface Quote {
  id: number;
  symbol: string;
  bid_price: number;
  ask_price: number;
  last_price: number;
  volume: number;
  timestamp: string;
  created_at: string;
}

