import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface TestAccountBalance {
  id: number;
  account_id: string;
  account_type: string;
  account_number: string;
  current_balance: number;
  available_cash: number;
  buying_power: number;
  timestamp: string;
  created_at: string;
}

interface TestTransaction {
  id: number;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  balance_before: number;
  balance_after: number;
  timestamp: string;
  created_at: string;
}

export class TestDataService {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async getLatestTestBalance(account_id: string = 'TEST-ACCOUNT-001'): Promise<TestAccountBalance | null> {
    const { data, error } = await this.client
      .from('test_account_balances')
      .select('*')
      .eq('account_id', account_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching test account balance:', error);
      return null;
    }

    return data;
  }

  async addTestTransaction(
    account_id: string,
    transaction_type: string,
    amount: number,
    description: string,
    balance_before: number,
    balance_after: number
  ): Promise<void> {
    const { error } = await this.client
      .from('test_transactions')
      .insert([{
        account_id,
        transaction_type,
        amount,
        description,
        balance_before,
        balance_after,
        timestamp: new Date().toISOString()
      }]);

    if (error) {
      throw new Error(`Test transaction insert error: ${error.message}`);
    }
  }

  async updateTestBalance(
    account_id: string,
    current_balance: number,
    available_cash: number,
    buying_power: number
  ): Promise<void> {
    const { error } = await this.client
      .from('test_account_balances')
      .insert([{
        account_id,
        account_type: 'MARGIN',
        account_number: 'TEST-001',
        current_balance,
        available_cash,
        buying_power,
        timestamp: new Date().toISOString()
      }]);

    if (error) {
      throw new Error(`Test balance update error: ${error.message}`);
    }
  }

  async getTestTransactions(account_id: string = 'TEST-ACCOUNT-001', limit: number = 50): Promise<TestTransaction[]> {
    const { data, error } = await this.client
      .from('test_transactions')
      .select('*')
      .eq('account_id', account_id)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching test transactions:', error);
      return [];
    }

    return data || [];
  }

  async fundAccount(account_id: string, amount: number, description: string = 'Account funding'): Promise<void> {
    const currentBalance = await this.getLatestTestBalance(account_id);
    const balanceBefore = currentBalance?.current_balance || 0;
    const balanceAfter = balanceBefore + amount;

    // Add transaction record
    await this.addTestTransaction(
      account_id,
      'FUNDING',
      amount,
      description,
      balanceBefore,
      balanceAfter
    );

    // Update account balance
    await this.updateTestBalance(
      account_id,
      balanceAfter,
      balanceAfter, // Available cash equals current balance for simplicity
      balanceAfter  // Buying power equals current balance for simplicity
    );
  }

  async withdrawFromAccount(account_id: string, amount: number, description: string = 'Account withdrawal'): Promise<void> {
    const currentBalance = await this.getLatestTestBalance(account_id);
    const balanceBefore = currentBalance?.current_balance || 0;
    const balanceAfter = Math.max(0, balanceBefore - amount); // Don't allow negative balance

    // Add transaction record
    await this.addTestTransaction(
      account_id,
      'WITHDRAWAL',
      amount,
      description,
      balanceBefore,
      balanceAfter
    );

    // Update account balance
    await this.updateTestBalance(
      account_id,
      balanceAfter,
      balanceAfter,
      balanceAfter
    );
  }
}
