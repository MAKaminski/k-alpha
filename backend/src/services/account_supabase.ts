import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface AccountBalanceInsert {
  account_id: string;
  account_type: string;
  account_number: string;
  current_balance: number;
  available_cash: number;
  buying_power: number;
  timestamp: string;
}

export class AccountSupabaseService {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async insert_account_balance(account_data: AccountBalanceInsert): Promise<void> {
    const { error } = await this.client
      .from('account_balances')
      .insert(account_data);

    if (error) {
      throw new Error(`Failed to insert account balance: ${error.message}`);
    }
  }

  async get_latest_account_balance(account_id: string): Promise<AccountBalanceInsert | null> {
    const { data, error } = await this.client
      .from('account_balances')
      .select('*')
      .eq('account_id', account_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No data found
      }
      throw new Error(`Failed to fetch account balance: ${error.message}`);
    }

    return data;
  }

  async get_account_balance_history(account_id: string, limit: number = 100): Promise<AccountBalanceInsert[]> {
    const { data, error } = await this.client
      .from('account_balances')
      .select('*')
      .eq('account_id', account_id)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch account balance history: ${error.message}`);
    }

    return data || [];
  }
}
