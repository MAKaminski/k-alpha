import 'dotenv/config';
import { OptionsClient } from '../../services/options_client.js';
import { SchwabAuth } from '../../utils/schwab_auth.js';

describe('Options Strike Validation Tests', () => {
  let optionsClient: OptionsClient;
  let schwabAuth: SchwabAuth;

  beforeAll(() => {
    schwabAuth = new SchwabAuth(
      process.env.SCHWAB_API_KEY || process.env.SCHWAB_CLIENT_ID || '',
      process.env.SCHWAB_API_SECRET || process.env.SCHWAB_CLIENT_SECRET || '',
      process.env.SCHWAB_CALLBACK_URL || process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1'
    );
    optionsClient = new OptionsClient('', () => schwabAuth.get_valid_access_token());
  });

  describe('Strike Calculation', () => {
    it('should calculate ±20 strikes with $1 increments correctly', () => {
      const currentPrice = 605.17;
      const strikes = (optionsClient as any).calculate_strikes(currentPrice);
      
      // Should have 41 strikes (ATM-20 to ATM+20)
      expect(strikes).toHaveLength(41);
      
      // Should be rounded to nearest dollar
      const roundedPrice = Math.round(currentPrice);
      expect(strikes[20]).toBe(roundedPrice); // ATM strike should be at index 20
      
      // Check range
      expect(strikes[0]).toBe(roundedPrice - 20); // First strike
      expect(strikes[40]).toBe(roundedPrice + 20); // Last strike
      
      // Check increments
      for (let i = 1; i < strikes.length; i++) {
        expect(strikes[i] - strikes[i - 1]).toBe(1); // $1 increments
      }
    });

    it('should handle different price levels correctly', () => {
      const testCases = [
        { price: 500.25, expected: 500 },
        { price: 500.75, expected: 501 },
        { price: 600.00, expected: 600 },
        { price: 750.99, expected: 751 }
      ];

      testCases.forEach(({ price, expected }) => {
        const strikes = (optionsClient as any).calculate_strikes(price);
        expect(strikes[20]).toBe(expected); // ATM should be rounded price
        expect(strikes[0]).toBe(expected - 20); // First strike
        expect(strikes[40]).toBe(expected + 20); // Last strike
      });
    });
  });

  describe('Strike Discovery', () => {
    it('should discover available strikes from Schwab API', async () => {
      const currentPrice = 605.17;
      
      // This will test the internal strike discovery logic
      const options = await optionsClient.fetch_0dte_options('QQQ', currentPrice);
      
      // Should find some options (may be 0 if markets closed)
      expect(Array.isArray(options)).toBe(true);
      
      if (options.length > 0) {
        // Verify we have both calls and puts
        const calls = options.filter(opt => opt.option_type === 'CALL');
        const puts = options.filter(opt => opt.option_type === 'PUT');
        
        expect(calls.length).toBeGreaterThan(0);
        expect(puts.length).toBeGreaterThan(0);
        
        // Verify strikes are within reasonable range
        const strikes = options.map(opt => opt.strike_price);
        const minStrike = Math.min(...strikes);
        const maxStrike = Math.max(...strikes);
        
        // Should be within ±20 range of current price
        expect(minStrike).toBeGreaterThanOrEqual(currentPrice - 20);
        expect(maxStrike).toBeLessThanOrEqual(currentPrice + 20);
      }
    }, 30000);

    it('should handle API errors gracefully', async () => {
      // Test with invalid symbol to trigger error handling
      const options = await optionsClient.fetch_0dte_options('INVALID', 600);
      
      // Should return empty array, not throw
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(0);
    }, 30000);
  });

  describe('Data Structure Validation', () => {
    it('should return properly structured option data', async () => {
      const options = await optionsClient.fetch_0dte_options('QQQ', 605);
      
      if (options.length > 0) {
        const option = options[0];
        
        // Check required fields
        expect(option).toHaveProperty('symbol');
        expect(option).toHaveProperty('underlying_symbol');
        expect(option).toHaveProperty('option_type');
        expect(option).toHaveProperty('strike_price');
        expect(option).toHaveProperty('expiration_date');
        expect(option).toHaveProperty('days_to_expiration');
        expect(option).toHaveProperty('timestamp');
        
        // Check data types
        expect(typeof option.symbol).toBe('string');
        expect(['CALL', 'PUT']).toContain(option.option_type);
        expect(typeof option.strike_price).toBe('number');
        expect(typeof option.days_to_expiration).toBe('number');
        expect(option.days_to_expiration).toBe(0); // Should be 0DTE
        
        // Check optional fields exist
        expect(option).toHaveProperty('bid_price');
        expect(option).toHaveProperty('ask_price');
        expect(option).toHaveProperty('last_price');
        expect(option).toHaveProperty('volume');
        expect(option).toHaveProperty('open_interest');
      }
    }, 30000);
  });
});
