import { OptionsClient } from '../../services/options_client.js';

describe('Options Strike Calculation Unit Tests', () => {
  let optionsClient: OptionsClient;

  beforeEach(() => {
    optionsClient = new OptionsClient('', () => Promise.resolve('mock-token'));
  });

  describe('calculate_strikes method', () => {
    it('should calculate ±20 strikes with $1 increments for QQQ at $605.17', () => {
      const currentPrice = 605.17;
      const strikes = (optionsClient as any).calculate_strikes(currentPrice);
      
      // Should have 41 strikes (ATM-20 to ATM+20)
      expect(strikes).toHaveLength(41);
      
      // Should round to nearest dollar (605)
      const roundedPrice = Math.round(currentPrice);
      expect(roundedPrice).toBe(605);
      
      // Check ATM strike is at index 20
      expect(strikes[20]).toBe(605);
      
      // Check first and last strikes
      expect(strikes[0]).toBe(585);  // 605 - 20
      expect(strikes[40]).toBe(625); // 605 + 20
      
      // Check all increments are $1
      for (let i = 1; i < strikes.length; i++) {
        expect(strikes[i] - strikes[i - 1]).toBe(1);
      }
      
      // Verify specific strikes
      expect(strikes).toContain(585);
      expect(strikes).toContain(590);
      expect(strikes).toContain(595);
      expect(strikes).toContain(600);
      expect(strikes).toContain(605);
      expect(strikes).toContain(610);
      expect(strikes).toContain(615);
      expect(strikes).toContain(620);
      expect(strikes).toContain(625);
    });

    it('should handle different price levels correctly', () => {
      const testCases = [
        { price: 500.25, expected: 500, first: 480, last: 520 },
        { price: 500.75, expected: 501, first: 481, last: 521 },
        { price: 600.00, expected: 600, first: 580, last: 620 },
        { price: 750.99, expected: 751, first: 731, last: 771 },
        { price: 1000.50, expected: 1001, first: 981, last: 1021 }
      ];

      testCases.forEach(({ price, expected, first, last }) => {
        const strikes = (optionsClient as any).calculate_strikes(price);
        
        expect(strikes).toHaveLength(41);
        expect(strikes[20]).toBe(expected); // ATM
        expect(strikes[0]).toBe(first);     // First strike
        expect(strikes[40]).toBe(last);     // Last strike
        
        // Verify increments
        for (let i = 1; i < strikes.length; i++) {
          expect(strikes[i] - strikes[i - 1]).toBe(1);
        }
      });
    });

    it('should handle edge cases', () => {
      // Test with very small price
      const smallPrice = 1.25;
      const smallStrikes = (optionsClient as any).calculate_strikes(smallPrice);
      expect(smallStrikes[20]).toBe(1); // Rounded to 1
      expect(smallStrikes[0]).toBe(-19); // 1 - 20
      expect(smallStrikes[40]).toBe(21); // 1 + 20
      
      // Test with very large price
      const largePrice = 9999.99;
      const largeStrikes = (optionsClient as any).calculate_strikes(largePrice);
      expect(largeStrikes[20]).toBe(10000); // Rounded to 10000
      expect(largeStrikes[0]).toBe(9980);   // 10000 - 20
      expect(largeStrikes[40]).toBe(10020); // 10000 + 20
    });

    it('should maintain consistent array structure', () => {
      const prices = [100, 500, 1000, 5000];
      
      prices.forEach(price => {
        const strikes = (optionsClient as any).calculate_strikes(price);
        
        // Always 41 elements
        expect(strikes).toHaveLength(41);
        
        // Always sorted ascending
        for (let i = 1; i < strikes.length; i++) {
          expect(strikes[i]).toBeGreaterThan(strikes[i - 1]);
        }
        
        // Always $1 increments
        for (let i = 1; i < strikes.length; i++) {
          expect(strikes[i] - strikes[i - 1]).toBe(1);
        }
        
        // ATM always at index 20
        const roundedPrice = Math.round(price);
        expect(strikes[20]).toBe(roundedPrice);
      });
    });
  });

  describe('Strike range validation', () => {
    it('should cover the expected range for QQQ', () => {
      const qqqPrice = 605.17;
      const strikes = (optionsClient as any).calculate_strikes(qqqPrice);
      
      // For QQQ at ~$605, we should have strikes from $585 to $625
      const expectedStrikes = [];
      for (let i = 585; i <= 625; i++) {
        expectedStrikes.push(i);
      }
      
      expect(strikes).toEqual(expectedStrikes);
    });

    it('should provide adequate coverage for options trading', () => {
      const testPrices = [100, 500, 1000, 2000];
      
      testPrices.forEach(price => {
        const strikes = (optionsClient as any).calculate_strikes(price);
        
        // Should cover ±20 range
        const range = strikes[40] - strikes[0];
        expect(range).toBe(40);
        
        // Should include ATM
        const roundedPrice = Math.round(price);
        expect(strikes).toContain(roundedPrice);
        
        // Should have reasonable coverage for ITM/OTM options
        const itmStrikes = strikes.filter((s: number) => s < roundedPrice).length;
        const otmStrikes = strikes.filter((s: number) => s > roundedPrice).length;
        
        expect(itmStrikes).toBe(20); // 20 ITM strikes
        expect(otmStrikes).toBe(20); // 20 OTM strikes
      });
    });
  });
});
