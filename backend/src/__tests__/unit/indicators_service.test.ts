import { IndicatorsService } from '../../services/indicators_service.js';
import { isWithinMarketHours, getSessionDate } from '../../utils/market_hours.js';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      data: [],
      error: null
    }))
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient
}));

describe('IndicatorsService', () => {
  let indicatorsService: IndicatorsService;

  beforeEach(() => {
    indicatorsService = new IndicatorsService('test-url', 'test-key');
    jest.clearAllMocks();
  });

  describe('calculateAndStoreIndicators', () => {
    it('should calculate indicators for a quote', async () => {
      const quote = {
        symbol: 'QQQ',
        last_price: 500.25,
        volume: 1000,
        timestamp: '2024-10-22T15:30:00Z'
      };

      // Mock database responses
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        })),
        insert: jest.fn(() => ({
          data: [],
          error: null
        }))
      });

      await indicatorsService.calculateAndStoreIndicators(quote);

      // Verify insert was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('indicators');
    });

    it('should handle database errors gracefully', async () => {
      const quote = {
        symbol: 'QQQ',
        last_price: 500.25,
        volume: 1000,
        timestamp: '2024-10-22T15:30:00Z'
      };

      // Mock database error
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: null,
                error: { message: 'Database error' }
              }))
            }))
          }))
        }))
      });

      await expect(
        indicatorsService.calculateAndStoreIndicators(quote)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getLatestIndicators', () => {
    it('should fetch latest indicators', async () => {
      const mockData = [
        {
          symbol: 'QQQ',
          last_price: 500.25,
          sma9: 499.50,
          session_vwap: 500.00,
          timestamp: '2024-10-22T15:30:00Z'
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                data: mockData,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await indicatorsService.getLatestIndicators('QQQ', 5);

      expect(result).toEqual(mockData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('indicators');
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', () => {
      // Add some data to cache
      (indicatorsService as any).sma9_cache.set('QQQ', [{ minute: new Date(), price: 500 }]);
      (indicatorsService as any).session_data_cache.set('QQQ_2024-10-22', { volume: 1000, pv_sum: 500000 });

      indicatorsService.clearCache();

      expect((indicatorsService as any).sma9_cache.size).toBe(0);
      expect((indicatorsService as any).session_data_cache.size).toBe(0);
    });
  });
});

describe('Market Hours Utility', () => {
  describe('isWithinMarketHours', () => {
    it('should detect market hours correctly', () => {
      // Test during market hours (2:30 PM ET)
      const marketTime = new Date('2024-10-22T18:30:00Z'); // 2:30 PM ET
      const result = isWithinMarketHours(marketTime);
      expect(result).toBe(true);
    });

    it('should detect non-market hours correctly', () => {
      // Test outside market hours (8:00 PM ET)
      const nonMarketTime = new Date('2024-10-22T00:00:00Z'); // 8:00 PM ET previous day
      const result = isWithinMarketHours(nonMarketTime);
      expect(result).toBe(false);
    });
  });

  describe('getSessionDate', () => {
    it('should return correct session date', () => {
      const testDate = new Date('2024-10-22T15:30:00Z');
      const sessionDate = getSessionDate(testDate);
      expect(sessionDate).toBe('2024-10-22');
    });
  });
});
