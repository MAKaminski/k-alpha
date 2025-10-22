import { CrossoverDetector } from '../../services/crossover_detector.js';

// Mock Supabase client
const mockInsert = jest.fn(() => ({
  data: [] as any[],
  error: null
}));

const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: mockInsert,
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [] as any[],
            error: null
          }))
        }))
      }))
    }))
  }))
};

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('CrossoverDetector Tests', () => {
  let crossoverDetector: CrossoverDetector;

  beforeEach(() => {
    crossoverDetector = new CrossoverDetector('test-url', 'test-key');
    jest.clearAllMocks();
  });

  describe('Crossover Detection Logic', () => {
    it('should detect bullish crossover (SMA9 crosses above VWAP)', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: 595, // SMA9 below VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 605,
        sma9: 602, // SMA9 above VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const signal = await crossoverDetector.processIndicatorData(current);
      
      // First call should return null (no previous data)
      expect(signal).toBeNull();

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      // Second call should detect crossover
      const signal2 = await crossoverDetector.processIndicatorData(current);
      
      expect(signal2).not.toBeNull();
      expect(signal2!.signal_type).toBe('BULLISH');
      expect(signal2!.crossover_direction).toBe('UP');
      expect(signal2!.price_at_crossover).toBe(605);
      expect(signal2!.sma9_at_crossover).toBe(602);
      expect(signal2!.vwap_at_crossover).toBe(600);
    });

    it('should detect bearish crossover (SMA9 crosses below VWAP)', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: 605, // SMA9 above VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 595,
        sma9: 598, // SMA9 below VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      const signal = await crossoverDetector.processIndicatorData(current);
      
      expect(signal).not.toBeNull();
      expect(signal!.signal_type).toBe('BEARISH');
      expect(signal!.crossover_direction).toBe('DOWN');
      expect(signal!.price_at_crossover).toBe(595);
      expect(signal!.sma9_at_crossover).toBe(598);
      expect(signal!.vwap_at_crossover).toBe(600);
    });

    it('should not detect crossover when SMA9 and VWAP are on same side', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: 595, // SMA9 below VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 605,
        sma9: 597, // SMA9 still below VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      const signal = await crossoverDetector.processIndicatorData(current);
      
      expect(signal).toBeNull();
    });

    it('should skip when SMA9 or VWAP is null', async () => {
      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 605,
        sma9: null, // SMA9 is null
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const signal = await crossoverDetector.processIndicatorData(current);
      
      expect(signal).toBeNull();
    });

    it('should skip when previous SMA9 or VWAP is null', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: null, // Previous SMA9 is null
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 605,
        sma9: 602,
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      const signal = await crossoverDetector.processIndicatorData(current);
      
      expect(signal).toBeNull();
    });
  });

  describe('Signal Storage', () => {
    it('should store crossover signal in database', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: 595,
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 605,
        sma9: 602,
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      const signal = await crossoverDetector.processIndicatorData(current);
      
      expect(signal).not.toBeNull();
      
      // Verify that insert was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('crossover_signals');
      expect(mockInsert).toHaveBeenCalledWith(signal);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exact crossover (SMA9 equals VWAP)', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: 595, // SMA9 below VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:01:00Z',
        last_price: 600,
        sma9: 600, // SMA9 equals VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      const signal = await crossoverDetector.processIndicatorData(current);
      
      // Should not detect crossover when SMA9 equals VWAP
      expect(signal).toBeNull();
    });

    it('should handle rapid price movements', async () => {
      const previous = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:00Z',
        last_price: 600,
        sma9: 595,
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      const current = {
        symbol: 'QQQ',
        timestamp: '2025-01-01T10:00:01Z', // 1 second later
        last_price: 610, // Large price movement
        sma9: 605, // SMA9 above VWAP
        session_vwap: 600,
        is_market_hours: true,
        session_date: '2025-01-01'
      };

      // Set up previous data
      crossoverDetector['lastIndicator'] = previous;

      const signal = await crossoverDetector.processIndicatorData(current);
      
      expect(signal).not.toBeNull();
      expect(signal!.signal_type).toBe('BULLISH');
      expect(signal!.price_at_crossover).toBe(610);
    });
  });
});
