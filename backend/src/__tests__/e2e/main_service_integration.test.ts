import 'dotenv/config';

// This is a comprehensive E2E test for the main service
describe('Main Service E2E Integration Tests', () => {
  it('should complete full data flow with real services', async () => {
    console.log('=== E2E INTEGRATION TEST ===');
    
    // Import the actual services
    const { SchwabClient } = await import('../../services/schwab_client.js');
    const { OptionsClient } = await import('../../services/options_client.js');
    const { IndicatorsService } = await import('../../services/indicators_service.js');
    const { SupabaseService } = await import('../../services/supabase_client.js');
    const { OptionsSupabaseService } = await import('../../services/options_supabase.js');
    const { SchwabAuth } = await import('../../utils/schwab_auth.js');
    const { CONSTANTS } = await import('../../config/constants.js');
    
    // Initialize services
    const schwab_auth = new SchwabAuth(
      process.env.SCHWAB_API_KEY || process.env.SCHWAB_CLIENT_ID || '',
      process.env.SCHWAB_API_SECRET || process.env.SCHWAB_CLIENT_SECRET || '',
      process.env.SCHWAB_CALLBACK_URL || process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1'
    );
    
    const schwab_client = new SchwabClient('', () => schwab_auth.get_valid_access_token());
    const options_client = new OptionsClient('', () => schwab_auth.get_valid_access_token());
    const supabase = new SupabaseService(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    const options_supabase = new OptionsSupabaseService(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    const indicators_service = new IndicatorsService(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    
    // Test the main service flow
    try {
      console.log('1. Fetching quote...');
      const quote = await schwab_client.fetch_quote(CONSTANTS.QUOTE_SYMBOL);
      console.log(`✅ Quote: ${quote.symbol} $${quote.last_price}`);
      
      console.log('2. Storing quote...');
      await supabase.insert_quote({
        symbol: quote.symbol,
        bid_price: quote.bid_price,
        ask_price: quote.ask_price,
        last_price: quote.last_price,
        volume: quote.volume,
        timestamp: quote.timestamp.toISOString()
      });
      console.log('✅ Quote stored');
      
      console.log('3. Calculating indicators...');
      await indicators_service.calculateAndStoreIndicators({
        symbol: quote.symbol,
        last_price: quote.last_price,
        volume: quote.volume,
        timestamp: quote.timestamp.toISOString()
      });
      console.log('✅ Indicators calculated');
      
      console.log('4. Fetching options...');
      const options = await options_client.fetch_0dte_options(CONSTANTS.QUOTE_SYMBOL, quote.last_price);
      console.log(`✅ Options: ${options.length} found`);
      
      if (options.length > 0) {
        console.log('5. Storing options...');
        await options_supabase.insert_options(options);
        console.log('✅ Options stored');
      } else {
        console.log('5. No options to store (normal if markets closed or no 0DTE options)');
      }
      
      console.log('\n✅ FULL DATA FLOW COMPLETED SUCCESSFULLY');
      
      // Verify data was stored
      console.log('\n6. Verifying stored data...');
      const latest_indicators = await indicators_service.getLatestIndicators(CONSTANTS.QUOTE_SYMBOL, 1);
      if (latest_indicators.length > 0) {
        const latest = latest_indicators[0];
        console.log(`✅ Latest indicators: SMA9=${latest.sma9 ? latest.sma9.toFixed(2) : 'N/A'}, VWAP=${latest.session_vwap ? latest.session_vwap.toFixed(2) : 'N/A'}`);
      }
      
    } catch (error) {
      console.error('❌ Error in data flow:', error);
      throw error;
    }
    
    console.log('\n=== E2E TEST COMPLETED ===');
  }, 30000); // 30 second timeout for real API calls
});
