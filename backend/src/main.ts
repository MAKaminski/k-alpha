import 'dotenv/config';
import { CONSTANTS } from './config/constants.js';
import { SchwabClient } from './services/schwab_client.js';
import { OptionsClient } from './services/options_client.js';
import { SupabaseService } from './services/supabase_client.js';
import { OptionsSupabaseService } from './services/options_supabase.js';
import { IndicatorsService } from './services/indicators_service.js';
import { SchwabAuth } from './utils/schwab_auth.js';
import { isWithinMarketHours } from './utils/market_hours.js';
import { log } from './utils/logger.js';

const schwab_auth = new SchwabAuth(
  process.env.SCHWAB_API_KEY || process.env.SCHWAB_CLIENT_ID || '',
  process.env.SCHWAB_API_SECRET || process.env.SCHWAB_CLIENT_SECRET || '',
  process.env.SCHWAB_CALLBACK_URL || process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1'
);

const schwab_client = new SchwabClient(
  '',
  () => schwab_auth.get_valid_access_token()
);

const options_client = new OptionsClient(
  '',
  () => schwab_auth.get_valid_access_token()
);

const supabase = new SupabaseService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const options_supabase = new OptionsSupabaseService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const indicators_service = new IndicatorsService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function fetch_and_store_quote(): Promise<void> {
  try {
    const quote = await schwab_client.fetch_quote(CONSTANTS.QUOTE_SYMBOL);
    
    await supabase.insert_quote({
      symbol: quote.symbol,
      bid_price: quote.bid_price,
      ask_price: quote.ask_price,
      last_price: quote.last_price,
      volume: quote.volume,
      timestamp: quote.timestamp.toISOString()
    });

    log(`Stored ${quote.symbol}: $${quote.last_price}`);
    
    // Calculate and store technical indicators
    await calculate_and_store_indicators(quote);
    
    // Fetch and store 0DTE options data
    await fetch_and_store_options(quote.last_price);
    
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function calculate_and_store_indicators(quote: any): Promise<void> {
  try {
    await indicators_service.calculateAndStoreIndicators({
      symbol: quote.symbol,
      last_price: quote.last_price,
      volume: quote.volume,
      timestamp: quote.timestamp.toISOString()
    });
    
    log(`Calculated indicators for ${quote.symbol}: $${quote.last_price}`);
  } catch (error) {
    log(`Indicators error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetch_and_store_options(current_price: number): Promise<void> {
  try {
    const options = await options_client.fetch_0dte_options(CONSTANTS.QUOTE_SYMBOL, current_price);
    
    if (options.length > 0) {
      await options_supabase.insert_options(options);
      
      // Count calls and puts
      const calls = options.filter(opt => opt.option_type === 'CALL').length;
      const puts = options.filter(opt => opt.option_type === 'PUT').length;
      
      // Get strike range
      const strikes = options.map(opt => opt.strike_price).sort((a, b) => a - b);
      const min_strike = strikes[0];
      const max_strike = strikes[strikes.length - 1];
      
      log(`Stored ${options.length} 0DTE options for ${CONSTANTS.QUOTE_SYMBOL} at $${current_price} (${calls} calls, ${puts} puts, strikes: $${min_strike}-$${max_strike})`);
    } else {
      // This is normal when markets are closed or no 0DTE options are available
      const is_market_hours = isWithinMarketHours();
      const reason = is_market_hours ? 'no 0DTE options available' : 'markets closed';
      log(`No 0DTE options found for ${CONSTANTS.QUOTE_SYMBOL} at $${current_price} (${reason})`);
    }
  } catch (error) {
    log(`Options error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function start_service(): Promise<void> {
  log(`Starting k-alpha service for ${CONSTANTS.QUOTE_SYMBOL}`);
  
  setInterval(
    fetch_and_store_quote,
    CONSTANTS.FETCH_INTERVAL_MS
  );
  
  await fetch_and_store_quote();
}

start_service();

