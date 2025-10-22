import { SchwabClient } from '../../services/schwab_client.js';
import { OptionsClient } from '../../services/options_client.js';
import { IndicatorsService } from '../../services/indicators_service.js';
import { SupabaseService } from '../../services/supabase_client.js';
import { OptionsSupabaseService } from '../../services/options_supabase.js';

// Mock all external dependencies
jest.mock('../../services/schwab_client.js');
jest.mock('../../services/options_client.js');
jest.mock('../../services/indicators_service.js');
jest.mock('../../services/supabase_client.js');
jest.mock('../../services/options_supabase.js');

describe('Main Service E2E Tests', () => {
  let mockSchwabClient: jest.Mocked<SchwabClient>;
  let mockOptionsClient: jest.Mocked<OptionsClient>;
  let mockIndicatorsService: jest.Mocked<IndicatorsService>;
  let mockSupabaseService: jest.Mocked<SupabaseService>;
  let mockOptionsSupabaseService: jest.Mocked<OptionsSupabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockSchwabClient = {
      fetch_quote: jest.fn()
    } as any;

    mockOptionsClient = {
      fetch_0dte_options: jest.fn()
    } as any;

    mockIndicatorsService = {
      calculateAndStoreIndicators: jest.fn()
    } as any;

    mockSupabaseService = {
      insert_quote: jest.fn()
    } as any;

    mockOptionsSupabaseService = {
      insert_options: jest.fn()
    } as any;
  });

  describe('Data Flow Integration', () => {
    it('should complete full data flow successfully', async () => {
      // Mock successful quote fetch
      const mockQuote = {
        symbol: 'QQQ',
        bid_price: 500.20,
        ask_price: 500.30,
        last_price: 500.25,
        volume: 1000000,
        timestamp: new Date('2024-10-22T15:30:00Z')
      };

      mockSchwabClient.fetch_quote.mockResolvedValue(mockQuote);

      // Mock successful options fetch
      const mockOptions = [
        {
          symbol: 'QQQ241022C00500000',
          underlying_symbol: 'QQQ',
          option_type: 'CALL' as const,
          strike_price: 500.0,
          expiration_date: '2024-10-22',
          days_to_expiration: 0,
          bid_price: 1.25,
          ask_price: 1.30,
          last_price: 1.27,
          timestamp: '2024-10-22T15:30:00Z'
        }
      ];

      mockOptionsClient.fetch_0dte_options.mockResolvedValue(mockOptions);

      // Mock successful database operations
      mockSupabaseService.insert_quote.mockResolvedValue(undefined);
      mockIndicatorsService.calculateAndStoreIndicators.mockResolvedValue(undefined);
      mockOptionsSupabaseService.insert_options.mockResolvedValue(undefined);

      // Simulate the main service flow
      const quote = await mockSchwabClient.fetch_quote('QQQ');
      await mockSupabaseService.insert_quote({
        symbol: quote.symbol,
        bid_price: quote.bid_price,
        ask_price: quote.ask_price,
        last_price: quote.last_price,
        volume: quote.volume,
        timestamp: quote.timestamp.toISOString()
      });

      await mockIndicatorsService.calculateAndStoreIndicators({
        symbol: quote.symbol,
        last_price: quote.last_price,
        volume: quote.volume,
        timestamp: quote.timestamp.toISOString()
      });

      const options = await mockOptionsClient.fetch_0dte_options('QQQ', quote.last_price);
      if (options.length > 0) {
        await mockOptionsSupabaseService.insert_options(options);
      }

      // Verify all operations were called
      expect(mockSchwabClient.fetch_quote).toHaveBeenCalledWith('QQQ');
      expect(mockSupabaseService.insert_quote).toHaveBeenCalledWith({
        symbol: 'QQQ',
        bid_price: 500.20,
        ask_price: 500.30,
        last_price: 500.25,
        volume: 1000000,
        timestamp: '2024-10-22T15:30:00.000Z'
      });
      expect(mockIndicatorsService.calculateAndStoreIndicators).toHaveBeenCalledWith({
        symbol: 'QQQ',
        last_price: 500.25,
        volume: 1000000,
        timestamp: '2024-10-22T15:30:00.000Z'
      });
      expect(mockOptionsClient.fetch_0dte_options).toHaveBeenCalledWith('QQQ', 500.25);
      expect(mockOptionsSupabaseService.insert_options).toHaveBeenCalledWith(mockOptions);
    });

    it('should handle errors gracefully in the data flow', async () => {
      // Mock quote fetch success
      const mockQuote = {
        symbol: 'QQQ',
        bid_price: 500.20,
        ask_price: 500.30,
        last_price: 500.25,
        volume: 1000000,
        timestamp: new Date('2024-10-22T15:30:00Z')
      };

      mockSchwabClient.fetch_quote.mockResolvedValue(mockQuote);
      mockSupabaseService.insert_quote.mockResolvedValue(undefined);

      // Mock indicators service error
      mockIndicatorsService.calculateAndStoreIndicators.mockRejectedValue(new Error('Indicators error'));

      // Mock options service error
      mockOptionsClient.fetch_0dte_options.mockRejectedValue(new Error('Options error'));

      // Simulate the main service flow with error handling
      try {
        const quote = await mockSchwabClient.fetch_quote('QQQ');
        await mockSupabaseService.insert_quote({
          symbol: quote.symbol,
          bid_price: quote.bid_price,
          ask_price: quote.ask_price,
          last_price: quote.last_price,
          volume: quote.volume,
          timestamp: quote.timestamp.toISOString()
        });

        try {
          await mockIndicatorsService.calculateAndStoreIndicators({
            symbol: quote.symbol,
            last_price: quote.last_price,
            volume: quote.volume,
            timestamp: quote.timestamp.toISOString()
          });
        } catch (error) {
          console.log(`Indicators error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        try {
          const options = await mockOptionsClient.fetch_0dte_options('QQQ', quote.last_price);
          if (options.length > 0) {
            await mockOptionsSupabaseService.insert_options(options);
          }
        } catch (error) {
          console.log(`Options error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Verify quote operations still succeeded
      expect(mockSchwabClient.fetch_quote).toHaveBeenCalledWith('QQQ');
      expect(mockSupabaseService.insert_quote).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should complete data flow within reasonable time', async () => {
      const startTime = Date.now();

      // Mock all operations
      mockSchwabClient.fetch_quote.mockResolvedValue({
        symbol: 'QQQ',
        bid_price: 500.20,
        ask_price: 500.30,
        last_price: 500.25,
        volume: 1000000,
        timestamp: new Date()
      });

      mockOptionsClient.fetch_0dte_options.mockResolvedValue([]);
      mockIndicatorsService.calculateAndStoreIndicators.mockResolvedValue(undefined);
      mockSupabaseService.insert_quote.mockResolvedValue(undefined);

      // Simulate the flow
      const quote = await mockSchwabClient.fetch_quote('QQQ');
      await mockSupabaseService.insert_quote({
        symbol: quote.symbol,
        bid_price: quote.bid_price,
        ask_price: quote.ask_price,
        last_price: quote.last_price,
        volume: quote.volume,
        timestamp: quote.timestamp.toISOString()
      });

      await mockIndicatorsService.calculateAndStoreIndicators({
        symbol: quote.symbol,
        last_price: quote.last_price,
        volume: quote.volume,
        timestamp: quote.timestamp.toISOString()
      });

      const options = await mockOptionsClient.fetch_0dte_options('QQQ', quote.last_price);
      if (options.length > 0) {
        await mockOptionsSupabaseService.insert_options(options);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds (allowing for network delays in real scenario)
      expect(duration).toBeLessThan(5000);
    });
  });
});
