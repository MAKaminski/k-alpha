import 'dotenv/config';
import { CONSTANTS } from './config/constants.js';
import { SchwabClient } from './services/schwab_client.js';
import { OptionsClient } from './services/options_client.js';
import { SupabaseService } from './services/supabase_client.js';
import { OptionsSupabaseService } from './services/options_supabase.js';
import { IndicatorsService } from './services/indicators_service.js';
import { CrossoverDetector } from './services/crossover_detector.js';
import { SchwabAuth } from './utils/schwab_auth.js';
import { isWithinMarketHours } from './utils/market_hours.js';
import { log, logInfo, logWarn, logError, LogLevel } from './utils/logger.js';
import { withEnhancedRateLimit, getEnhancedRateLimitStatus, logRateLimitStatus } from './utils/enhanced_rate_limiter.js';
import { requestTracker } from './utils/request_tracker.js';

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

const crossover_detector = new CrossoverDetector(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function fetch_and_store_quote(): Promise<void> {
  try {
    log(`📊 Starting fetch cycle - Current rate: ${requestTracker.getCurrentRequestCount()}/min`);
    
    // Use enhanced rate limiting with service tracking
    const quote = await withEnhancedRateLimit(
      'quotes',
      '/quotes',
      'GET',
      () => schwab_client.fetch_quote(CONSTANTS.QUOTE_SYMBOL)
    );
    
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
    
    // Fetch and store 0DTE options data (only during market hours)
    if (isWithinMarketHours()) {
      log(`📈 Fetching options data - Current rate: ${requestTracker.getCurrentRequestCount()}/min`);
      await fetch_and_store_options(quote.last_price);
    }
    
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
    
    // Check for crossover signals after storing indicators
    await check_for_crossover_signals(quote);
    
  } catch (error) {
    log(`Indicators error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetch_and_store_options(current_price: number): Promise<void> {
  try {
    // Use enhanced rate limiting with service tracking
    const options = await withEnhancedRateLimit(
      'options',
      '/chains',
      'GET',
      () => options_client.fetch_0dte_options(CONSTANTS.QUOTE_SYMBOL, current_price)
    );
    
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

async function check_for_crossover_signals(quote: any): Promise<void> {
  try {
    // Get the latest indicator data for crossover detection
    const { data: latestIndicator, error } = await indicators_service.supabase
      .from('indicators')
      .select('*')
      .eq('symbol', quote.symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !latestIndicator) {
      return; // No indicator data available yet
    }

    // Process the indicator data for crossover detection
    const signal = await crossover_detector.processIndicatorData({
      symbol: latestIndicator.symbol,
      timestamp: latestIndicator.timestamp,
      last_price: latestIndicator.last_price,
      sma9: latestIndicator.sma9,
      session_vwap: latestIndicator.session_vwap,
      is_market_hours: latestIndicator.is_market_hours,
      session_date: latestIndicator.session_date
    });

    if (signal) {
      log(`🎯 ${signal.signal_type} signal detected: SMA9 ${signal.crossover_direction} VWAP at $${signal.price_at_crossover}`);
      
      // Log trading recommendation
      if (signal.signal_type === 'BULLISH') {
        log(`📈 BULLISH SIGNAL: Consider buying calls - SMA9 crossed above VWAP`);
      } else {
        log(`📉 BEARISH SIGNAL: Consider selling puts - SMA9 crossed below VWAP`);
      }
    }
    
  } catch (error) {
    log(`Crossover detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function start_service(): Promise<void> {
  logInfo(`Starting k-alpha service for ${CONSTANTS.QUOTE_SYMBOL}`);
  logInfo(`Rate limit: 120 calls/min, using 5-second intervals (12 calls/min max)`);
  
  // Start the main data fetching loop
  setInterval(
    fetch_and_store_quote,
    CONSTANTS.FETCH_INTERVAL_MS
  );
  
  // Start enhanced rate limit monitoring
  setInterval(() => {
    logRateLimitStatus();
  }, 10000); // Check every 10 seconds
  
  await fetch_and_store_quote();
}

// Add graceful shutdown handling
process.on('SIGTERM', () => {
  logInfo('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  logError(`Stack: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

start_service().catch((error) => {
  logError(`Failed to start service: ${error.message}`);
  process.exit(1);
});

