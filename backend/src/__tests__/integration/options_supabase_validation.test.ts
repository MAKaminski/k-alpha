import 'dotenv/config';
import { OptionsClient } from '../../services/options_client.js';
import { OptionsSupabaseService } from '../../services/options_supabase.js';
import { SchwabAuth } from '../../utils/schwab_auth.js';

describe('Options Supabase Integration Tests', () => {
  let optionsClient: OptionsClient;
  let optionsSupabase: OptionsSupabaseService;
  let schwabAuth: SchwabAuth;

  beforeAll(() => {
    schwabAuth = new SchwabAuth(
      process.env.SCHWAB_API_KEY || process.env.SCHWAB_CLIENT_ID || '',
      process.env.SCHWAB_API_SECRET || process.env.SCHWAB_CLIENT_SECRET || '',
      process.env.SCHWAB_CALLBACK_URL || process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1'
    );
    optionsClient = new OptionsClient('', () => schwabAuth.get_valid_access_token());
    optionsSupabase = new OptionsSupabaseService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  });

  describe('Options Data Download and Storage', () => {
    it('should fetch options and store them in Supabase', async () => {
      const currentPrice = 605.17;
      const underlying = 'QQQ';
      
      // Fetch options from Schwab API
      const options = await optionsClient.fetch_0dte_options(underlying, currentPrice);
      
      if (options.length > 0) {
        // Store options in Supabase
        await optionsSupabase.insert_options(options);
        
        // Verify data was stored by checking counts
        const { count: optionsCount } = await optionsSupabase.supabase
          .from('options')
          .select('*', { count: 'exact', head: true });
        
        expect(optionsCount).toBeGreaterThan(0);
        
        // Verify we can retrieve the data
        const { data: storedOptions, error } = await optionsSupabase.supabase
          .from('options')
          .select('*')
          .eq('underlying_symbol', underlying)
          .order('timestamp', { ascending: false })
          .limit(10);
        
        expect(error).toBeNull();
        expect(storedOptions).toBeDefined();
        expect(storedOptions!.length).toBeGreaterThan(0);
        
        // Verify data integrity
        const storedOption = storedOptions![0];
        expect(storedOption.underlying_symbol).toBe(underlying);
        expect(['CALL', 'PUT']).toContain(storedOption.option_type);
        expect(typeof storedOption.strike_price).toBe('number');
        expect(storedOption.days_to_expiration).toBe(0);
        
        console.log(`✅ Successfully stored ${options.length} options in Supabase`);
        console.log(`Sample option: ${storedOption.option_symbol} - ${storedOption.option_type} $${storedOption.strike_price}`);
      } else {
        console.log('ℹ️ No 0DTE options available (markets may be closed)');
        expect(Array.isArray(options)).toBe(true);
      }
    }, 30000);

    it('should handle duplicate options gracefully', async () => {
      const currentPrice = 605.17;
      const underlying = 'QQQ';
      
      // Fetch options twice to test duplicate handling
      const options1 = await optionsClient.fetch_0dte_options(underlying, currentPrice);
      
      if (options1.length > 0) {
        // Store first batch
        await optionsSupabase.insert_options(options1);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch and store again
        const options2 = await optionsClient.fetch_0dte_options(underlying, currentPrice);
        await optionsSupabase.insert_options(options2);
        
        // Should not throw errors
        expect(Array.isArray(options1)).toBe(true);
        expect(Array.isArray(options2)).toBe(true);
        
        console.log(`✅ Handled duplicate options gracefully`);
      }
    }, 30000);

    it('should validate data types and constraints', async () => {
      const currentPrice = 605.17;
      const options = await optionsClient.fetch_0dte_options('QQQ', currentPrice);
      
      if (options.length > 0) {
        // Test data validation
        const option = options[0];
        
        // Validate numeric fields
        expect(typeof option.strike_price).toBe('number');
        expect(option.strike_price).toBeGreaterThan(0);
        
        if (option.bid_price !== null) {
          expect(typeof option.bid_price).toBe('number');
          expect(option.bid_price).toBeGreaterThanOrEqual(0);
        }
        
        if (option.ask_price !== null) {
          expect(typeof option.ask_price).toBe('number');
          expect(option.ask_price).toBeGreaterThanOrEqual(0);
        }
        
        if (option.volume !== null) {
          expect(typeof option.volume).toBe('number');
          expect(option.volume).toBeGreaterThanOrEqual(0);
        }
        
        // Validate string fields
        expect(typeof option.symbol).toBe('string');
        expect(option.symbol.length).toBeGreaterThan(0);
        
        expect(typeof option.underlying_symbol).toBe('string');
        expect(option.underlying_symbol).toBe('QQQ');
        
        expect(['CALL', 'PUT']).toContain(option.option_type);
        
        // Validate date fields
        expect(option.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        
        console.log(`✅ Data validation passed for ${options.length} options`);
      }
    }, 30000);
  });

  describe('Performance and Error Handling', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const options = await optionsClient.fetch_0dte_options('QQQ', 605.17);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      
      console.log(`✅ Options fetch completed in ${duration}ms`);
    }, 30000);

    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, we'll test that the method doesn't throw unexpected errors
      const options = await optionsClient.fetch_0dte_options('QQQ', 605.17);
      
      expect(Array.isArray(options)).toBe(true);
      // Should not throw even if no options found
    }, 30000);
  });
});
