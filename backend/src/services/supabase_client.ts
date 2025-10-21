import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface QuoteInsert {
  symbol: string;
  bid_price: number;
  ask_price: number;
  last_price: number;
  volume: number;
  timestamp: string;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async insert_quote(quote: QuoteInsert): Promise<void> {
    const { error } = await this.client
      .from('quotes')
      .insert([quote]);

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }
  }
}

