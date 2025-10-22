import 'dotenv/config';
import { OptionsClient } from '../../services/options_client.js';
import { OptionsSupabaseService } from '../../services/options_supabase.js';
import { SchwabAuth } from '../../utils/schwab_auth.js';
import { isWithinMarketHours } from '../../utils/market_hours.js';

describe('Options Full Flow E2E Tests', () => {
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

  describe('Complete Options Data Flow', () => {
    it('should execute full options workflow: fetch -> validate -> store -> verify', async () => {
      const currentPrice = 605.17;
      const underlying = 'QQQ';
      const isMarketOpen = isWithinMarketHours();
      
      console.log(`\n=== Options E2E Test ===`);
      console.log(`Current Price: $${currentPrice}`);
      console.log(`Market Hours: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);
      
      // Step 1: Fetch options from Schwab API
      console.log('\n1. Fetching options from Schwab API...');
      const startTime = Date.now();
      const options = await optionsClient.fetch_0dte_options(underlying, currentPrice);
      const fetchTime = Date.now() - startTime;
      
      console.log(`   Fetched ${options.length} options in ${fetchTime}ms`);
      
      if (options.length > 0) {
        // Step 2: Validate strike range
        console.log('\n2. Validating strike range...');
        const strikes = options.map(opt => opt.strike_price).sort((a, b) => a - b);
        const minStrike = strikes[0];
        const maxStrike = strikes[strikes.length - 1];
        const strikeRange = maxStrike - minStrike;
        
        console.log(`   Strike range: $${minStrike} - $${maxStrike} (${strikeRange} points)`);
        console.log(`   Expected range: ±20 from $${Math.round(currentPrice)}`);
        
        // Validate we're within ±20 range
        const expectedMin = Math.round(currentPrice) - 20;
        const expectedMax = Math.round(currentPrice) + 20;
        expect(minStrike).toBeGreaterThanOrEqual(expectedMin);
        expect(maxStrike).toBeLessThanOrEqual(expectedMax);
        
        // Step 3: Validate data quality
        console.log('\n3. Validating data quality...');
        const calls = options.filter(opt => opt.option_type === 'CALL');
        const puts = options.filter(opt => opt.option_type === 'PUT');
        
        console.log(`   Calls: ${calls.length}`);
        console.log(`   Puts: ${puts.length}`);
        
        expect(calls.length).toBeGreaterThan(0);
        expect(puts.length).toBeGreaterThan(0);
        
        // Validate all options have required fields
        options.forEach((option, index) => {
          expect(option.symbol).toBeDefined();
          expect(option.underlying_symbol).toBe(underlying);
          expect(['CALL', 'PUT']).toContain(option.option_type);
          expect(option.strike_price).toBeGreaterThan(0);
          expect(option.days_to_expiration).toBe(0);
        });
        
        // Step 4: Store in Supabase
        console.log('\n4. Storing options in Supabase...');
        const storeStartTime = Date.now();
        await optionsSupabase.insert_options(options);
        const storeTime = Date.now() - storeStartTime;
        
        console.log(`   Stored ${options.length} options in ${storeTime}ms`);
        
        // Step 5: Verify data in Supabase
        console.log('\n5. Verifying data in Supabase...');
        const { data: storedOptions, error } = await optionsSupabase.supabase
          .from('options')
          .select('*')
          .eq('underlying_symbol', underlying)
          .order('timestamp', { ascending: false })
          .limit(options.length);
        
        expect(error).toBeNull();
        expect(storedOptions).toBeDefined();
        expect(storedOptions!.length).toBeGreaterThanOrEqual(options.length);
        
        // Verify data integrity
        const sampleOption = storedOptions![0];
        expect(sampleOption.underlying_symbol).toBe(underlying);
        expect(['CALL', 'PUT']).toContain(sampleOption.option_type);
        expect(typeof sampleOption.strike_price).toBe('number');
        
        console.log(`   Verified ${storedOptions!.length} options in database`);
        console.log(`   Sample: ${sampleOption.option_symbol} - ${sampleOption.option_type} $${sampleOption.strike_price}`);
        
        // Step 6: Performance summary
        console.log('\n6. Performance Summary:');
        console.log(`   Total time: ${Date.now() - startTime}ms`);
        console.log(`   Options per second: ${(options.length / ((Date.now() - startTime) / 1000)).toFixed(2)}`);
        console.log(`   Strike coverage: ${strikes.length} unique strikes`);
        console.log(`   Data quality: ✅ All valid`);
        
        console.log('\n✅ Full options workflow completed successfully!');
        
      } else {
        console.log('\nℹ️ No 0DTE options available');
        if (!isMarketOpen) {
          console.log('   Reason: Markets are closed');
        } else {
          console.log('   Reason: No 0DTE options found (unusual during market hours)');
        }
        
        // Even with no options, the system should not throw errors
        expect(Array.isArray(options)).toBe(true);
        console.log('\n✅ System handled no-options scenario gracefully');
      }
    }, 60000);

    it('should handle multiple consecutive fetches', async () => {
      const currentPrice = 605.17;
      const underlying = 'QQQ';
      
      console.log('\n=== Multiple Fetches Test ===');
      
      // Perform 3 consecutive fetches
      for (let i = 1; i <= 3; i++) {
        console.log(`\nFetch ${i}/3...`);
        
        const startTime = Date.now();
        const options = await optionsClient.fetch_0dte_options(underlying, currentPrice);
        const fetchTime = Date.now() - startTime;
        
        console.log(`   Fetched ${options.length} options in ${fetchTime}ms`);
        
        if (options.length > 0) {
          await optionsSupabase.insert_options(options);
          console.log(`   Stored ${options.length} options in Supabase`);
        }
        
        // Wait between fetches
        if (i < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('\n✅ Multiple consecutive fetches completed successfully');
    }, 90000);
  });

  describe('Error Scenarios', () => {
    it('should handle invalid underlying symbol', async () => {
      const options = await optionsClient.fetch_0dte_options('INVALID_SYMBOL', 600);
      
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(0);
      
      console.log('✅ Handled invalid symbol gracefully');
    }, 30000);

    it('should handle extreme price values', async () => {
      const extremePrices = [1, 1000, 10000];
      
      for (const price of extremePrices) {
        const options = await optionsClient.fetch_0dte_options('QQQ', price);
        expect(Array.isArray(options)).toBe(true);
        console.log(`   Price $${price}: ${options.length} options`);
      }
      
      console.log('✅ Handled extreme prices gracefully');
    }, 30000);
  });
});
