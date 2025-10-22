import { OptionsClient } from '../../services/options_client.js';

// Mock fetch
global.fetch = jest.fn();

describe('OptionsClient', () => {
  let optionsClient: OptionsClient;
  const mockToken = 'mock-access-token';

  beforeEach(() => {
    optionsClient = new OptionsClient(mockToken);
    jest.clearAllMocks();
  });

  describe('calculate_strikes', () => {
    it('should calculate ATM ±5 strikes correctly', () => {
      const currentPrice = 500.25;
      const strikes = (optionsClient as any).calculate_strikes(currentPrice);
      
      // Should round to nearest $0.50 and generate 11 strikes
      expect(strikes).toHaveLength(11);
      expect(strikes[0]).toBe(497.5); // ATM-5
      expect(strikes[5]).toBe(500.0); // ATM
      expect(strikes[10]).toBe(502.5); // ATM+5
    });

    it('should handle decimal prices correctly', () => {
      const currentPrice = 499.73;
      const strikes = (optionsClient as any).calculate_strikes(currentPrice);
      
      // Should round 499.73 to 500.0
      expect(strikes[5]).toBe(500.0); // ATM
    });
  });

  describe('generate_option_symbols', () => {
    it('should generate correct option symbols for 0DTE', () => {
      const underlying = 'QQQ';
      const strikes = [498, 498.5, 499, 499.5, 500, 500.5, 501, 501.5, 502, 502.5, 503];
      const expirationDate = '2024-10-22';
      
      const symbols = (optionsClient as any).generate_option_symbols(underlying, strikes, expirationDate);
      
      // Should generate 22 symbols (11 strikes × 2 types)
      expect(symbols).toHaveLength(22);
      
      // Check CALL symbols
      expect(symbols).toContain('QQQ241022C00498000');
      expect(symbols).toContain('QQQ241022C00500000');
      expect(symbols).toContain('QQQ241022C00503000');
      
      // Check PUT symbols
      expect(symbols).toContain('QQQ241022P00498000');
      expect(symbols).toContain('QQQ241022P00500000');
      expect(symbols).toContain('QQQ241022P00503000');
    });
  });

  describe('parse_option_symbol', () => {
    it('should parse CALL option symbols correctly', () => {
      const symbol = 'QQQ241022C00500000';
      const underlying = 'QQQ';
      
      const result = (optionsClient as any).parse_option_symbol(symbol, underlying);
      
      expect(result).toEqual({
        type: 'CALL',
        strike: 500.0
      });
    });

    it('should parse PUT option symbols correctly', () => {
      const symbol = 'QQQ241022P00498000';
      const underlying = 'QQQ';
      
      const result = (optionsClient as any).parse_option_symbol(symbol, underlying);
      
      expect(result).toEqual({
        type: 'PUT',
        strike: 498.0
      });
    });

    it('should return null for invalid symbols', () => {
      const symbol = 'INVALID';
      const underlying = 'QQQ';
      
      const result = (optionsClient as any).parse_option_symbol(symbol, underlying);
      
      expect(result).toBeNull();
    });
  });

  describe('fetch_0dte_options', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(
        optionsClient.fetch_0dte_options('QQQ', 500)
      ).rejects.toThrow('API Error');
    });

    it('should handle empty API responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const result = await optionsClient.fetch_0dte_options('QQQ', 500);
      expect(result).toEqual([]);
    });

    it('should process valid API responses', async () => {
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
            openInterest: 5000,
            delta: 0.5,
            gamma: 0.01,
            theta: -0.05,
            vega: 0.1,
            rho: 0.02,
            volatility: 0.25,
            intrinsicValue: 0.0,
            timeValue: 1.27,
            quoteTime: Date.now()
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await optionsClient.fetch_0dte_options('QQQ', 500);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        symbol: 'QQQ241022C00500000',
        underlying_symbol: 'QQQ',
        option_type: 'CALL',
        strike_price: 500.0,
        days_to_expiration: 0,
        bid_price: 1.25,
        ask_price: 1.30,
        last_price: 1.27
      });
    });
  });
});
