import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface OptionInsert {
  symbol: string;
  underlying_symbol: string;
  option_type: 'CALL' | 'PUT';
  strike_price: number;
  expiration_date: string;
  days_to_expiration: number;
  bid_price?: number;
  ask_price?: number;
  last_price?: number;
  mark_price?: number;
  volume?: number;
  open_interest?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  implied_volatility?: number;
  intrinsic_value?: number;
  time_value?: number;
  quote_time?: string;
  timestamp: string;
}

export class OptionsSupabaseService {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async insert_options(options: OptionInsert[]): Promise<void> {
    if (options.length === 0) return;
    
    const { error } = await this.client
      .from('options')
      .insert(options);

    if (error) {
      throw new Error(`Supabase options insert error: ${error.message}`);
    }
  }

  async get_latest_options(underlying_symbol: string, limit: number = 100): Promise<OptionInsert[]> {
    const { data, error } = await this.client
      .from('options')
      .select('*')
      .eq('underlying_symbol', underlying_symbol)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Supabase options select error: ${error.message}`);
    }

    return data || [];
  }

  async get_options_by_strike(underlying_symbol: string, strike_price: number, option_type: 'CALL' | 'PUT'): Promise<OptionInsert[]> {
    const { data, error } = await this.client
      .from('options')
      .select('*')
      .eq('underlying_symbol', underlying_symbol)
      .eq('strike_price', strike_price)
      .eq('option_type', option_type)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Supabase options select error: ${error.message}`);
    }

    return data || [];
  }
}
