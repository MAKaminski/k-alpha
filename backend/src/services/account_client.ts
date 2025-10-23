import { CONSTANTS } from '../config/constants.js';
import { nowEST } from '../utils/timezone.js';

interface AccountData {
  account_id: string;
  account_type: string;
  account_number: string;
  current_balance: number;
  available_cash: number;
  buying_power: number;
  timestamp: Date;
}

interface SchwabAccountResponse {
  securitiesAccount: {
    type: string;
    accountNumber: string;
    currentBalances: {
      liquidationValue: number;
      equity: number;
      availableFunds: number;
      cashBalance: number;
      buyingPower: number;
    };
  };
}

export class AccountClient {
  private access_token: string;
  private get_access_token?: () => Promise<string>;

  constructor(access_token: string, get_access_token?: () => Promise<string>) {
    this.access_token = access_token;
    this.get_access_token = get_access_token;
  }

  private async get_current_token(): Promise<string> {
    if (this.get_access_token) {
      return await this.get_access_token();
    }
    return this.access_token;
  }

  async fetch_account_balance(account_id: string): Promise<AccountData> {
    try {
      // First, try to get all accounts to find the correct account hash
      const accounts = await this.fetch_accounts();
      
      console.log(`🔍 Account API Debug - Retrieved ${accounts.length} accounts`);
      
      // Find the account that matches our target account ID
      // Normalize account IDs by removing dashes for comparison
      const normalizeAccountId = (id: string) => id.replace(/-/g, '');
      const normalizedTargetId = normalizeAccountId(account_id);
      
      const targetAccount = accounts.find(acc => 
        acc.account_id === account_id || 
        acc.account_number === account_id ||
        normalizeAccountId(acc.account_id) === normalizedTargetId ||
        normalizeAccountId(acc.account_number) === normalizedTargetId ||
        acc.account_id.includes(account_id) ||
        acc.account_number.includes(account_id)
      );
      
      if (!targetAccount) {
        console.log(`🔍 Account API Debug - Available accounts:`, accounts.map(acc => ({ 
          id: acc.account_id, 
          number: acc.account_number,
          type: acc.account_type 
        })));
        throw new Error(`Account ${account_id} not found in available accounts`);
      }
      
      console.log(`🔍 Account API Debug - Found target account:`, {
        id: targetAccount.account_id,
        number: targetAccount.account_number,
        type: targetAccount.account_type,
        balance: targetAccount.current_balance,
        cash: targetAccount.available_cash,
        buying_power: targetAccount.buying_power
      });
      
      return targetAccount;
    } catch (error) {
      console.log(`🔍 Account API Debug - Error in fetch_account_balance:`, error);
      throw error;
    }
  }

  async fetch_accounts(): Promise<AccountData[]> {
    const url = 'https://api.schwabapi.com/trader/v1/accounts';
    const token = await this.get_current_token();
    
    console.log(`🔍 Accounts API Debug - URL: ${url}`);
    console.log(`🔍 Accounts API Debug - Token length: ${token.length}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`🔍 Accounts API Debug - Response status: ${response.status}`);
    console.log(`🔍 Accounts API Debug - Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`🔍 Accounts API Debug - Error response body: ${errorText}`);
      throw new Error(`Schwab Accounts API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    console.log(`🔍 Accounts API Debug - Response data:`, JSON.stringify(data, null, 2));
    
    // Handle different response structures
    let accounts: SchwabAccountResponse[];
    if (data.accounts && Array.isArray(data.accounts)) {
      accounts = data.accounts;
    } else if (Array.isArray(data)) {
      accounts = data;
    } else {
      console.log(`🔍 Accounts API Debug - Unexpected response structure:`, typeof data, Object.keys(data || {}));
      throw new Error(`Unexpected response structure from accounts API`);
    }
    
    return accounts.map(account => {
      const securitiesAccount = account.securitiesAccount;
      const currentBalances = securitiesAccount.currentBalances;
      
      return {
        account_id: securitiesAccount.accountNumber,
        account_type: securitiesAccount.type,
        account_number: securitiesAccount.accountNumber,
        current_balance: currentBalances.liquidationValue || currentBalances.equity || 0,
        available_cash: currentBalances.availableFunds || currentBalances.cashBalance || 0,
        buying_power: currentBalances.buyingPower || 0,
        timestamp: nowEST()
      };
    });
  }
}
