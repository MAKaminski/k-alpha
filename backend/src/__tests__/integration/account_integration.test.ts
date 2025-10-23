import 'dotenv/config';
import { AccountClient } from '../../services/account_client.js';
import { SchwabAuth } from '../../utils/schwab_auth.js';

describe('Account Integration Tests', () => {
  let accountClient: AccountClient;
  let schwabAuth: SchwabAuth;

  beforeAll(() => {
    // Skip if no credentials available
    if (!process.env.SCHWAB_API_KEY || !process.env.SCHWAB_API_SECRET) {
      console.log('Skipping integration tests - no Schwab credentials');
      return;
    }

    schwabAuth = new SchwabAuth(
      process.env.SCHWAB_API_KEY!,
      process.env.SCHWAB_API_SECRET!,
      process.env.SCHWAB_CALLBACK_URL || 'https://127.0.0.1'
    );

    accountClient = new AccountClient(
      '',
      () => schwabAuth.get_valid_access_token()
    );
  });

  it('should authenticate and fetch accounts', async () => {
    if (!accountClient) {
      console.log('Skipping - no credentials');
      return;
    }

    const token = await schwabAuth.get_valid_access_token();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);

    const accounts = await accountClient.fetch_accounts();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThan(0);

    // Verify account structure
    const account = accounts[0];
    expect(account).toHaveProperty('account_id');
    expect(account).toHaveProperty('account_type');
    expect(account).toHaveProperty('account_number');
    expect(account).toHaveProperty('current_balance');
    expect(account).toHaveProperty('available_cash');
    expect(account).toHaveProperty('buying_power');
    expect(account).toHaveProperty('timestamp');
    expect(account.timestamp).toBeInstanceOf(Date);
  });

  it('should find target account by ID', async () => {
    if (!accountClient) {
      console.log('Skipping - no credentials');
      return;
    }

    const targetAccountId = process.env.SCHWAB_ACCOUNT_ID || '8042-3452';
    const account = await accountClient.fetch_account_balance(targetAccountId);
    
    expect(account).toBeDefined();
    expect(account.account_id).toBeDefined();
    expect(account.account_type).toBeDefined();
    expect(typeof account.current_balance).toBe('number');
    expect(typeof account.available_cash).toBe('number');
    expect(typeof account.buying_power).toBe('number');
  });

  it('should handle timestamp conversion correctly', async () => {
    if (!accountClient) {
      console.log('Skipping - no credentials');
      return;
    }

    const account = await accountClient.fetch_account_balance(process.env.SCHWAB_ACCOUNT_ID || '8042-3452');
    
    // Verify timestamp is a valid Date object
    expect(account.timestamp).toBeInstanceOf(Date);
    expect(account.timestamp.getTime()).toBeGreaterThan(0);
    
    // Verify timestamp is recent (within last 5 minutes)
    const now = new Date();
    const timeDiff = now.getTime() - account.timestamp.getTime();
    expect(timeDiff).toBeLessThan(5 * 60 * 1000); // 5 minutes
  });
});
