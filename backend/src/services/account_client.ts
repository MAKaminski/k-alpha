import { CONSTANTS } from '../config/constants.js';

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
  accountNumber: string;
  accountType: string;
  accountId: string;
  currentBalances: {
    cashBalance: number;
    cashAvailableForTrading: number;
    totalValue: number;
    buyingPower: number;
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
    const url = `https://api.schwabapi.com/trader/v1/accounts/${account_id}`;
    const token = await this.get_current_token();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Schwab Account API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as SchwabAccountResponse;

    return {
      account_id: data.accountId,
      account_type: data.accountType,
      account_number: data.accountNumber,
      current_balance: data.currentBalances.totalValue,
      available_cash: data.currentBalances.cashAvailableForTrading,
      buying_power: data.currentBalances.buyingPower,
      timestamp: new Date()
    };
  }

  async fetch_accounts(): Promise<AccountData[]> {
    const url = 'https://api.schwabapi.com/trader/v1/accounts';
    const token = await this.get_current_token();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Schwab Accounts API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { accounts: SchwabAccountResponse[] };
    
    return data.accounts.map(account => ({
      account_id: account.accountId,
      account_type: account.accountType,
      account_number: account.accountNumber,
      current_balance: account.currentBalances.totalValue,
      available_cash: account.currentBalances.cashAvailableForTrading,
      buying_power: account.currentBalances.buyingPower,
      timestamp: new Date()
    }));
  }
}
