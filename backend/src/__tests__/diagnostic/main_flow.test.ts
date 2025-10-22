import 'dotenv/config';

// This is a diagnostic test to identify the main service issues
describe('Main Service Diagnostic Tests', () => {
  it('should identify why options and indicators are not working', async () => {
    console.log('=== DIAGNOSTIC TEST ===');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'SET' : 'NOT SET');
    console.log('SCHWAB_CLIENT_ID:', process.env.SCHWAB_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('SCHWAB_CLIENT_SECRET:', process.env.SCHWAB_CLIENT_SECRET ? 'SET' : 'NOT SET');
    
    // Test imports
    try {
      const { SchwabClient } = await import('../../services/schwab_client.js');
      console.log('✅ SchwabClient import successful');
    } catch (error) {
      console.log('❌ SchwabClient import failed:', error);
    }
    
    try {
      const { OptionsClient } = await import('../../services/options_client.js');
      console.log('✅ OptionsClient import successful');
    } catch (error) {
      console.log('❌ OptionsClient import failed:', error);
    }
    
    try {
      const { IndicatorsService } = await import('../../services/indicators_service.js');
      console.log('✅ IndicatorsService import successful');
    } catch (error) {
      console.log('❌ IndicatorsService import failed:', error);
    }
    
    try {
      const { SupabaseService } = await import('../../services/supabase_client.js');
      console.log('✅ SupabaseService import successful');
    } catch (error) {
      console.log('❌ SupabaseService import failed:', error);
    }
    
    try {
      const { OptionsSupabaseService } = await import('../../services/options_supabase.js');
      console.log('✅ OptionsSupabaseService import successful');
    } catch (error) {
      console.log('❌ OptionsSupabaseService import failed:', error);
    }
    
    // Test main service import
    try {
      const mainModule = await import('../../main.js');
      console.log('✅ Main service import successful');
    } catch (error) {
      console.log('❌ Main service import failed:', error);
    }
    
    console.log('=== END DIAGNOSTIC ===');
    
    // This test always passes - it's just for diagnostics
    expect(true).toBe(true);
  });
});
