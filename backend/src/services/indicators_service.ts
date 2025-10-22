import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isWithinMarketHours, getSessionDate } from '../utils/market_hours.js';

interface IndicatorData {
  symbol: string;
  timestamp: string;
  last_price: number;
  volume: number;
  sma9?: number;
  session_vwap?: number;
  session_date: string;
  is_market_hours: boolean;
  session_start_time?: string;
  session_volume?: number;
  session_pv_sum?: number;
}

interface QuoteData {
  symbol: string;
  last_price: number;
  volume: number;
  timestamp: string;
}

export class IndicatorsService {
  private client: SupabaseClient;
  private sma9_cache: Map<string, number[]> = new Map();
  private session_data_cache: Map<string, { volume: number; pv_sum: number }> = new Map();

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  /**
   * Calculate and store technical indicators for a quote
   */
  async calculateAndStoreIndicators(quote: QuoteData): Promise<void> {
    const session_date = getSessionDate(new Date(quote.timestamp));
    const is_market_hours = isWithinMarketHours(new Date(quote.timestamp));
    const cache_key = `${quote.symbol}_${session_date}`;

    // Calculate SMA9
    const sma9 = await this.calculateSMA9(quote.symbol, quote.last_price);

    // Calculate Session VWAP (only during market hours)
    let session_vwap: number | undefined;
    let session_start_time: string | undefined;
    let session_volume: number | undefined;
    let session_pv_sum: number | undefined;

    if (is_market_hours) {
      const vwap_data = await this.calculateSessionVWAP(quote.symbol, quote.last_price, quote.volume, session_date);
      session_vwap = vwap_data.vwap;
      session_start_time = vwap_data.session_start_time;
      session_volume = vwap_data.session_volume;
      session_pv_sum = vwap_data.session_pv_sum;
    }

    // Prepare indicator data
    const indicator_data: IndicatorData = {
      symbol: quote.symbol,
      timestamp: quote.timestamp,
      last_price: quote.last_price,
      volume: quote.volume,
      sma9,
      session_vwap,
      session_date,
      is_market_hours,
      session_start_time,
      session_volume,
      session_pv_sum
    };

    // Store in database
    await this.storeIndicators(indicator_data);
  }

  /**
   * Calculate 9-period Simple Moving Average
   */
  private async calculateSMA9(symbol: string, current_price: number): Promise<number | undefined> {
    const cache_key = symbol;
    
    // Get existing prices from cache or database
    let prices = this.sma9_cache.get(cache_key) || [];
    
    // If we don't have enough data, fetch from database
    if (prices.length < 9) {
      const recent_prices = await this.getRecentPrices(symbol, 9);
      prices = recent_prices.map(p => p.last_price);
    }
    
    // Add current price
    prices.push(current_price);
    
    // Keep only last 9 prices
    if (prices.length > 9) {
      prices = prices.slice(-9);
    }
    
    // Update cache
    this.sma9_cache.set(cache_key, prices);
    
    // Calculate SMA9 if we have enough data
    if (prices.length >= 9) {
      const sum = prices.reduce((a, b) => a + b, 0);
      return sum / 9;
    }
    
    return undefined;
  }

  /**
   * Calculate Session Volume Weighted Average Price
   */
  private async calculateSessionVWAP(
    symbol: string, 
    current_price: number, 
    current_volume: number, 
    session_date: string
  ): Promise<{ vwap: number; session_start_time: string; session_volume: number; session_pv_sum: number }> {
    const cache_key = `${symbol}_${session_date}`;
    
    // Get existing session data from cache or database
    let session_data = this.session_data_cache.get(cache_key);
    
    if (!session_data) {
      // Fetch session data from database
      const existing_data = await this.getSessionData(symbol, session_date);
      session_data = {
        volume: existing_data.volume,
        pv_sum: existing_data.pv_sum
      };
    }
    
    // Add current tick data
    session_data.volume += current_volume;
    session_data.pv_sum += current_price * current_volume;
    
    // Update cache
    this.session_data_cache.set(cache_key, session_data);
    
    // Calculate VWAP
    const vwap = session_data.volume > 0 ? session_data.pv_sum / session_data.volume : current_price;
    
    // Get session start time
    const session_start_time = await this.getSessionStartTime(symbol, session_date);
    
    return {
      vwap,
      session_start_time,
      session_volume: session_data.volume,
      session_pv_sum: session_data.pv_sum
    };
  }

  /**
   * Get recent prices for SMA calculation
   */
  private async getRecentPrices(symbol: string, limit: number): Promise<{ last_price: number; timestamp: string }[]> {
    const { data, error } = await this.client
      .from('quotes')
      .select('last_price, timestamp')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error fetching recent prices: ${error.message}`);
    }

    return (data || []).reverse(); // Reverse to get chronological order
  }

  /**
   * Get existing session data for VWAP calculation
   */
  private async getSessionData(symbol: string, session_date: string): Promise<{ volume: number; pv_sum: number }> {
    const { data, error } = await this.client
      .from('indicators')
      .select('session_volume, session_pv_sum')
      .eq('symbol', symbol)
      .eq('session_date', session_date)
      .eq('is_market_hours', true)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error fetching session data: ${error.message}`);
    }

    if (data && data.length > 0) {
      return {
        volume: data[0].session_volume || 0,
        pv_sum: data[0].session_pv_sum || 0
      };
    }

    return { volume: 0, pv_sum: 0 };
  }

  /**
   * Get session start time
   */
  private async getSessionStartTime(symbol: string, session_date: string): Promise<string> {
    const { data, error } = await this.client
      .from('indicators')
      .select('session_start_time')
      .eq('symbol', symbol)
      .eq('session_date', session_date)
      .eq('is_market_hours', true)
      .not('session_start_time', 'is', null)
      .order('timestamp', { ascending: true })
      .limit(1);

    if (error) {
      throw new Error(`Error fetching session start time: ${error.message}`);
    }

    if (data && data.length > 0) {
      return data[0].session_start_time;
    }

    // If no existing session start time, use current time
    return new Date().toISOString();
  }

  /**
   * Store indicators in database
   */
  private async storeIndicators(data: IndicatorData): Promise<void> {
    const { error } = await this.client
      .from('indicators')
      .insert([data]);

    if (error) {
      throw new Error(`Error storing indicators: ${error.message}`);
    }
  }

  /**
   * Get latest indicators for a symbol
   */
  async getLatestIndicators(symbol: string, limit: number = 100): Promise<IndicatorData[]> {
    const { data, error } = await this.client
      .from('indicators')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error fetching indicators: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.sma9_cache.clear();
    this.session_data_cache.clear();
  }
}
