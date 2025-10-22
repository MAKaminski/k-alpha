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

interface MinutePrice {
  minute: Date;
  price: number;
}

export class IndicatorsService {
  public supabase: SupabaseClient;
  private sma9_cache: Map<string, MinutePrice[]> = new Map();
  private session_data_cache: Map<string, { volume: number; pv_sum: number; last_total_volume?: number }> = new Map();

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  /**
   * Calculate and store technical indicators for a quote
   */
  async calculateAndStoreIndicators(quote: QuoteData): Promise<void> {
    const session_date = getSessionDate(new Date(quote.timestamp));
    const is_market_hours = isWithinMarketHours(new Date(quote.timestamp));
    const cache_key = `${quote.symbol}_${session_date}`;

    // Calculate SMA9 (minute-based)
    const sma9 = await this.calculateSMA9(quote.symbol, quote.last_price, quote.timestamp);

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
   * Calculate 9-period Simple Moving Average (minute-based)
   */
  private async calculateSMA9(symbol: string, current_price: number, current_timestamp: string): Promise<number | undefined> {
    const cache_key = symbol;
    const current_time = new Date(current_timestamp);
    const current_minute = new Date(current_time.getFullYear(), current_time.getMonth(), current_time.getDate(), current_time.getHours(), current_time.getMinutes());
    
    // Get existing minute prices from cache or database
    let minute_prices = this.sma9_cache.get(cache_key) || [];
    
    // If we don't have enough data, fetch from database
    if (minute_prices.length < 9) {
      const recent_minute_prices = await this.getRecentMinutePrices(symbol, 9);
      minute_prices = recent_minute_prices;
    }
    
    // Check if we need to add a new minute price
    const last_minute = minute_prices.length > 0 ? minute_prices[minute_prices.length - 1].minute : null;
    
    if (!last_minute || current_minute.getTime() !== last_minute.getTime()) {
      // New minute - add current price
      minute_prices.push({
        minute: current_minute,
        price: current_price
      });
      
      // Keep only last 9 minutes
      if (minute_prices.length > 9) {
        minute_prices = minute_prices.slice(-9);
      }
      
      // Update cache
      this.sma9_cache.set(cache_key, minute_prices);
    } else {
      // Same minute - update the price (use latest price for the minute)
      minute_prices[minute_prices.length - 1].price = current_price;
    }
    
    // Calculate SMA9 if we have enough data
    if (minute_prices.length >= 9) {
      const sum = minute_prices.reduce((a, b) => a + b.price, 0);
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
    current_total_volume: number, 
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
        pv_sum: existing_data.pv_sum,
        last_total_volume: existing_data.last_total_volume || 0
      };
    }
    
    // Calculate incremental volume (volume traded since last tick)
    const incremental_volume = Math.max(0, current_total_volume - (session_data?.last_total_volume || 0));
    
    // Only add to VWAP if there was actual trading volume
    if (incremental_volume > 0 && session_data) {
      session_data.volume += incremental_volume;
      session_data.pv_sum += current_price * incremental_volume;
    }
    
    // Update last total volume for next calculation
    if (session_data) {
      session_data.last_total_volume = current_total_volume;
      
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
    
    // Fallback if session_data is undefined
    return {
      vwap: current_price,
      session_start_time: '',
      session_volume: 0,
      session_pv_sum: 0
    };
  }

  /**
   * Get recent minute prices for SMA calculation
   */
  private async getRecentMinutePrices(symbol: string, limit: number): Promise<MinutePrice[]> {
    // Get recent quotes and aggregate by minute
    const { data, error } = await this.supabase
      .from('quotes')
      .select('last_price, timestamp')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(limit * 60); // Get more data to ensure we have enough minutes

    if (error) {
      throw new Error(`Error fetching recent prices: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by minute and take the last price of each minute
    const minute_map = new Map<string, { minute: Date; price: number }>();
    
    for (const quote of data.reverse()) { // Reverse to get chronological order
      const timestamp = new Date(quote.timestamp);
      const minute = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours(), timestamp.getMinutes());
      const minute_key = minute.toISOString();
      
      // Keep the last price for each minute
      minute_map.set(minute_key, {
        minute: minute,
        price: quote.last_price
      });
    }

    // Convert to array and sort by minute
    const minute_prices = Array.from(minute_map.values()).sort((a, b) => a.minute.getTime() - b.minute.getTime());
    
    // Return only the last 'limit' minutes
    return minute_prices.slice(-limit);
  }

  /**
   * Get recent prices for SMA calculation (legacy method - keeping for compatibility)
   */
  private async getRecentPrices(symbol: string, limit: number): Promise<{ last_price: number; timestamp: string }[]> {
    const { data, error } = await this.supabase
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
  private async getSessionData(symbol: string, session_date: string): Promise<{ volume: number; pv_sum: number; last_total_volume?: number }> {
    // First try to get data with last_total_volume column
    let { data, error } = await this.supabase
      .from('indicators')
      .select('session_volume, session_pv_sum, last_total_volume')
      .eq('symbol', symbol)
      .eq('session_date', session_date)
      .eq('is_market_hours', true)
      .order('timestamp', { ascending: false })
      .limit(1);

    // If that fails, try without last_total_volume (fallback for older schema)
    if (error && error.message.includes('last_total_volume')) {
      console.log('last_total_volume column not found, falling back to basic query');
      const fallbackResult = await this.supabase
        .from('indicators')
        .select('session_volume, session_pv_sum')
        .eq('symbol', symbol)
        .eq('session_date', session_date)
        .eq('is_market_hours', true)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw new Error(`Error fetching session data: ${error.message}`);
    }

    if (data && data.length > 0) {
      return {
        volume: data[0].session_volume || 0,
        pv_sum: data[0].session_pv_sum || 0,
        last_total_volume: data[0].last_total_volume || 0
      };
    }

    return { volume: 0, pv_sum: 0, last_total_volume: 0 };
  }

  /**
   * Get session start time
   */
  private async getSessionStartTime(symbol: string, session_date: string): Promise<string> {
    const { data, error } = await this.supabase
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
    const { error } = await this.supabase
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
    const { data, error } = await this.supabase
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
