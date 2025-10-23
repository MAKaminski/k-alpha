import { AccountClient } from '../../services/account_client.js';

// Mock fetch
global.fetch = jest.fn();

describe('AccountClient Unit Tests', () => {
  let accountClient: AccountClient;
  const mockToken = 'mock-access-token';

  beforeEach(() => {
    accountClient = new AccountClient(mockToken);
    jest.clearAllMocks();
  });

  describe('fetch_accounts', () => {
    it('should parse Schwab API response correctly', async () => {
      const mockResponse = [
        {
          securitiesAccount: {
            type: 'MARGIN',
            accountNumber: '80423452',
            currentBalances: {
              liquidationValue: 200000.50,
              equity: 200000.50,
              availableFunds: 150000.25,
              cashBalance: 150000.25,
              buyingPower: 400000.00
            }
          }
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await accountClient.fetch_accounts();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        account_id: '80423452',
        account_type: 'MARGIN',
        account_number: '80423452',
        current_balance: 200000.50,
        available_cash: 150000.25,
        buying_power: 400000.00
      });
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle array response format', async () => {
      const mockResponse = [
        {
          securitiesAccount: {
            type: 'CASH',
            accountNumber: '12345678',
            currentBalances: {
              liquidationValue: 100000.00,
              equity: 100000.00,
              availableFunds: 100000.00,
              cashBalance: 100000.00,
              buyingPower: 100000.00
            }
          }
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await accountClient.fetch_accounts();
      expect(result).toHaveLength(1);
      expect(result[0].account_id).toBe('12345678');
    });

    it('should handle object with accounts array format', async () => {
      const mockResponse = {
        accounts: [
          {
            securitiesAccount: {
              type: 'MARGIN',
              accountNumber: '87654321',
              currentBalances: {
                liquidationValue: 50000.00,
                equity: 50000.00,
                availableFunds: 50000.00,
                cashBalance: 50000.00,
                buyingPower: 50000.00
              }
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await accountClient.fetch_accounts();
      expect(result).toHaveLength(1);
      expect(result[0].account_id).toBe('87654321');
    });

    it('should throw error for unexpected response structure', async () => {
      const mockResponse = { unexpected: 'structure' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      await expect(accountClient.fetch_accounts()).rejects.toThrow('Unexpected response structure from accounts API');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map([['content-type', 'application/json']]),
        text: async () => 'Unauthorized'
      });

      await expect(accountClient.fetch_accounts()).rejects.toThrow('Schwab Accounts API error: 401 Unauthorized');
    });
  });

  describe('fetch_account_balance', () => {
    it('should find account with exact match', async () => {
      const mockAccounts = [
        {
          account_id: '80423452',
          account_type: 'MARGIN',
          account_number: '80423452',
          current_balance: 200000.00,
          available_cash: 150000.00,
          buying_power: 400000.00,
          timestamp: new Date()
        }
      ];

      jest.spyOn(accountClient, 'fetch_accounts').mockResolvedValue(mockAccounts);

      const result = await accountClient.fetch_account_balance('80423452');
      expect(result).toEqual(mockAccounts[0]);
    });

    it('should find account with dash normalization', async () => {
      const mockAccounts = [
        {
          account_id: '80423452',
          account_type: 'MARGIN',
          account_number: '80423452',
          current_balance: 200000.00,
          available_cash: 150000.00,
          buying_power: 400000.00,
          timestamp: new Date()
        }
      ];

      jest.spyOn(accountClient, 'fetch_accounts').mockResolvedValue(mockAccounts);

      const result = await accountClient.fetch_account_balance('8042-3452');
      expect(result).toEqual(mockAccounts[0]);
    });

    it('should throw error when account not found', async () => {
      const mockAccounts = [
        {
          account_id: '12345678',
          account_type: 'CASH',
          account_number: '12345678',
          current_balance: 100000.00,
          available_cash: 100000.00,
          buying_power: 100000.00,
          timestamp: new Date()
        }
      ];

      jest.spyOn(accountClient, 'fetch_accounts').mockResolvedValue(mockAccounts);

      await expect(accountClient.fetch_account_balance('8042-3452')).rejects.toThrow('Account 8042-3452 not found in available accounts');
    });
  });
});
