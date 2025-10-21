import 'dotenv/config';
import { CONSTANTS } from './config/constants.js';
import { SchwabClient } from './services/schwab_client.js';
import { SupabaseService } from './services/supabase_client.js';
import { SchwabAuth } from './utils/schwab_auth.js';
import { log } from './utils/logger.js';

const schwab_auth = new SchwabAuth(
  process.env.SCHWAB_CLIENT_ID || '',
  process.env.SCHWAB_CLIENT_SECRET || '',
  process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1'
);

const schwab_client = new SchwabClient(
  '',
  () => schwab_auth.get_valid_access_token()
);

const supabase = new SupabaseService(
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
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

