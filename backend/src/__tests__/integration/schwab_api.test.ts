import { SchwabClient } from '../../services/schwab_client.js';
import { OptionsClient } from '../../services/options_client.js';

// Mock fetch
global.fetch = jest.fn();

describe('Schwab API Integration Tests', () => {
  const mockToken = 'mock-access-token';

  describe('SchwabClient', () => {
    let schwabClient: SchwabClient;

    beforeEach(() => {
      schwabClient = new SchwabClient(mockToken);
      jest.clearAllMocks();
    });

    it('should fetch quote data successfully', async () => {
      const mockResponse = {
        'QQQ': {
          quote: {
            bidPrice: 500.20,
            askPrice: 500.30,
            lastPrice: 500.25,
            totalVolume: 1000000,
            quoteTime: Date.now()
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await schwabClient.fetch_quote('QQQ');

      expect(result).toMatchObject({
        symbol: 'QQQ',
        bid_price: 500.20,
        ask_price: 500.30,
        last_price: 500.25,
        volume: 1000000
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.schwabapi.com/marketdata/v1/quotes?symbols=QQQ',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(schwabClient.fetch_quote('QQQ')).rejects.toThrow('Schwab API error: 401 Unauthorized');
    });

    it('should handle missing quote data', async () => {
      const mockResponse = {
        'QQQ': {
          quote: null
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await expect(schwabClient.fetch_quote('QQQ')).rejects.toThrow('No quote data for QQQ');
    });
  });

  describe('OptionsClient', () => {
    let optionsClient: OptionsClient;

    beforeEach(() => {
      optionsClient = new OptionsClient(mockToken);
      jest.clearAllMocks();
    });

    it('should fetch 0DTE options successfully', async () => {
      const mockResponse = {
        'QQQ241022C00500000': {
          option: {
            symbol: 'QQQ241022C00500000',
            optionType: 'CALL',
            strikePrice: 500.0,
            expirationDate: '2024-10-22',
            daysToExpiration: 0,
            bid: 1.25,
            ask: 1.30,
            last: 1.27,
            mark: 1.275,
            totalVolume: 1000,
            openInterest: 5000
          }
        },
        'QQQ241022P00500000': {
          option: {
            symbol: 'QQQ241022P00500000',
            optionType: 'PUT',
            strikePrice: 500.0,
            expirationDate: '2024-10-22',
            daysToExpiration: 0,
            bid: 1.20,
            ask: 1.25,
            last: 1.22,
            mark: 1.225,
            totalVolume: 800,
            openInterest: 3000
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await optionsClient.fetch_0dte_options('QQQ', 500);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        symbol: 'QQQ241022C00500000',
        underlying_symbol: 'QQQ',
        option_type: 'CALL',
        strike_price: 500.0,
        days_to_expiration: 0
      });
      expect(result[1]).toMatchObject({
        symbol: 'QQQ241022P00500000',
        underlying_symbol: 'QQQ',
        option_type: 'PUT',
        strike_price: 500.0,
        days_to_expiration: 0
      });
    });

    it('should handle empty options response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const result = await optionsClient.fetch_0dte_options('QQQ', 500);
      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(optionsClient.fetch_0dte_options('QQQ', 500)).rejects.toThrow('Schwab API error: 401 Unauthorized');
    });
  });
});
