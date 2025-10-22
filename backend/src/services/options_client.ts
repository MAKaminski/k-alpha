import { CONSTANTS } from '../config/constants.js';

interface OptionData {
  symbol: string;
  underlying_symbol: string;
  option_type: 'CALL' | 'PUT';
  strike_price: number;
  expiration_date: string;
  days_to_expiration: number;
  bid_price?: number;
  ask_price?: number;
  last_price?: number;
  mark_price?: number;
  volume?: number;
  open_interest?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  implied_volatility?: number;
  intrinsic_value?: number;
  time_value?: number;
  quote_time?: string;
  timestamp: string;
}

interface SchwabOptionResponse {
  [symbol: string]: {
    option?: {
      symbol?: string;
      optionType?: string;
      strikePrice?: number;
      expirationDate?: string;
      daysToExpiration?: number;
      bid?: number;
      ask?: number;
      last?: number;
      mark?: number;
      totalVolume?: number;
      openInterest?: number;
      delta?: number;
      gamma?: number;
      theta?: number;
      vega?: number;
      rho?: number;
      volatility?: number;
      intrinsicValue?: number;
      timeValue?: number;
      quoteTime?: number;
    };
  };
}

export class OptionsClient {
  private access_token: string;
  private get_access_token?: () => Promise<string>;

  constructor(access_token: string, get_access_token?: () => Promise<string>) {
    this.access_token = access_token;
    this.get_access_token = get_access_token;
  }

  private async get_current_token(): Promise<string> {
    if (this.get_access_token) {
      return await this.get_access_token();
    }
    return this.access_token;
  }

  /**
   * Calculate strike prices for ATM ±20 strikes with $1 increments
   */
  private calculate_strikes(current_price: number): number[] {
    const strikes: number[] = [];
    
    // Round current price to nearest dollar for options
    const rounded_price = Math.round(current_price);
    
    // Generate strikes: ATM-20, ATM-19, ..., ATM, ..., ATM+19, ATM+20
    for (let i = -20; i <= 20; i++) {
      strikes.push(rounded_price + i);
    }
    
    return strikes;
  }

  /**
   * Generate option symbols for 0DTE options
   */
  private generate_option_symbols(underlying: string, strikes: number[], expiration_date: string): string[] {
    const symbols: string[] = [];
    const date_str = expiration_date.replace(/-/g, '').substring(2); // YYMMDD format
    
    for (const strike of strikes) {
      const strike_str = Math.round(strike * 1000).toString().padStart(8, '0');
      
      // Generate CALL and PUT symbols
      symbols.push(`${underlying}${date_str}C${strike_str}`);
      symbols.push(`${underlying}${date_str}P${strike_str}`);
    }
    
    return symbols;
  }

  /**
   * Get current date in YYMMDD format for 0DTE options
   */
  private get_today_date_string(): string {
    const today = new Date();
    const year = today.getFullYear().toString().substring(2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Fetch 0DTE options data for given underlying and current price
   */
  async fetch_0dte_options(underlying: string, current_price: number): Promise<OptionData[]> {
    try {
      const token = await this.get_current_token();
      const today_str = this.get_today_date_string();
      
      // Find available strikes by testing common strike levels
      const test_strikes = [500, 550, 600, 650, 700, 750, 800];
      const available_strikes = [];
      
      // First, find what strikes are actually available
      for (const strike of test_strikes) {
        try {
          const response = await fetch(
            `${CONSTANTS.SCHWAB_API_BASE_URL}/chains?symbol=${underlying}&contractType=ALL&includeQuotes=TRUE&strategy=SINGLE&interval=1&strike=${strike}&range=ALL`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json() as any;
            const today_key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}:0`;
            
            if (data.callExpDateMap && data.callExpDateMap[today_key]) {
              const strikes = Object.keys(data.callExpDateMap[today_key]);
              if (strikes.length > 0) {
                available_strikes.push(...strikes.map(s => parseFloat(s)));
              }
            }
          }
        } catch (error) {
          // Ignore errors during discovery
        }
      }
      
      // Remove duplicates and sort
      const unique_available_strikes = [...new Set(available_strikes)].sort((a, b) => a - b);
      
      // Find strikes closest to current price (±20 range)
      const closest_strikes = unique_available_strikes
        .map(strike => ({ strike, diff: Math.abs(strike - current_price) }))
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 41) // Get up to 41 strikes (±20)
        .map(item => item.strike);
      
      console.log(`Available strikes: ${unique_available_strikes.join(', ')}`);
      console.log(`Using closest strikes: ${closest_strikes.join(', ')}`);
      
      // Query the closest strikes
      const all_options: OptionData[] = [];
      
      for (const strike of closest_strikes) {
        try {
          const response = await fetch(
            `${CONSTANTS.SCHWAB_API_BASE_URL}/chains?symbol=${underlying}&contractType=ALL&includeQuotes=TRUE&strategy=SINGLE&interval=1&strike=${strike}&range=ALL`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            const options = this.parse_chains_response(data, underlying, today_str);
            all_options.push(...options);
          }
        } catch (error) {
          console.warn(`Error fetching options for strike ${strike}:`, error);
        }
      }
      
      // Remove duplicates based on symbol
      const unique_options = all_options.filter((option, index, self) => 
        index === self.findIndex(o => o.symbol === option.symbol)
      );
      
      return unique_options;
    } catch (error) {
      console.error('Error fetching 0DTE options:', error);
      throw error;
    }
  }

  async fetch_options_for_date(underlying: string, current_price: number, expiration_date: string): Promise<OptionData[]> {
    const strikes = this.calculate_strikes(current_price);
    const option_symbols = this.generate_option_symbols(underlying, strikes, expiration_date);
    
    // Split into chunks of 50 (Schwab API limit)
    const chunks = [];
    for (let i = 0; i < option_symbols.length; i += 50) {
      chunks.push(option_symbols.slice(i, i + 50));
    }
    
    const all_options: OptionData[] = [];
    
    for (const chunk of chunks) {
      const options = await this.fetch_options_batch(chunk, underlying, expiration_date);
      all_options.push(...options);
    }
    
    return all_options;
  }

  /**
   * Fetch a batch of options data
   */
  private async fetch_options_batch(symbols: string[], underlying: string, expiration_date: string): Promise<OptionData[]> {
    const url = `${CONSTANTS.SCHWAB_API_BASE_URL}/quotes?symbols=${symbols.join(',')}`;
    const token = await this.get_current_token();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Schwab API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as SchwabOptionResponse;
    const options: OptionData[] = [];
    
    for (const [symbol, option_data] of Object.entries(data)) {
      const option = option_data.option;
      if (!option) continue;
      
      // Parse option symbol to extract strike and type
      const option_info = this.parse_option_symbol(symbol, underlying);
      if (!option_info) continue;
      
      options.push({
        symbol: symbol,
        underlying_symbol: underlying,
        option_type: option_info.type,
        strike_price: option_info.strike,
        expiration_date: expiration_date,
        days_to_expiration: 0, // 0DTE
        bid_price: option.bid,
        ask_price: option.ask,
        last_price: option.last,
        mark_price: option.mark,
        volume: option.totalVolume,
        open_interest: option.openInterest,
        delta: option.delta,
        gamma: option.gamma,
        theta: option.theta,
        vega: option.vega,
        rho: option.rho,
        implied_volatility: option.volatility,
        intrinsic_value: option.intrinsicValue,
        time_value: option.timeValue,
        quote_time: option.quoteTime ? new Date(option.quoteTime).toISOString() : undefined,
        timestamp: new Date().toISOString()
      });
    }
    
    return options;
  }

  /**
   * Parse Schwab chains API response
   */
  private parse_chains_response(data: any, underlying: string, expiration_date: string, min_strike?: number, max_strike?: number): OptionData[] {
    const options: OptionData[] = [];
    const today_key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}:0`;
    
    // Process calls
    if (data.callExpDateMap && data.callExpDateMap[today_key]) {
      const calls = data.callExpDateMap[today_key];
      for (const [strike_str, strike_data] of Object.entries(calls)) {
        const strike_price = parseFloat(strike_str);
        
        // Filter by strike range if provided
        if (min_strike !== undefined && max_strike !== undefined) {
          if (strike_price < min_strike || strike_price > max_strike) {
            continue;
          }
        }
        
        for (const [symbol, option_data] of Object.entries(strike_data as any)) {
          // The option data is directly in the strike_data, not nested under 'option'
          const option = option_data as any;
          if (option && option.symbol) {
            options.push(this.create_option_data(option.symbol, underlying, 'CALL', option, expiration_date));
          }
        }
      }
    }
    
    // Process puts
    if (data.putExpDateMap && data.putExpDateMap[today_key]) {
      const puts = data.putExpDateMap[today_key];
      for (const [strike_str, strike_data] of Object.entries(puts)) {
        const strike_price = parseFloat(strike_str);
        
        // Filter by strike range if provided
        if (min_strike !== undefined && max_strike !== undefined) {
          if (strike_price < min_strike || strike_price > max_strike) {
            continue;
          }
        }
        
        for (const [symbol, option_data] of Object.entries(strike_data as any)) {
          // The option data is directly in the strike_data, not nested under 'option'
          const option = option_data as any;
          if (option && option.symbol) {
            options.push(this.create_option_data(option.symbol, underlying, 'PUT', option, expiration_date));
          }
        }
      }
    }
    
    return options;
  }

  /**
   * Create OptionData from Schwab option data
   */
  private create_option_data(symbol: string, underlying: string, type: 'CALL' | 'PUT', option: any, expiration_date: string): OptionData {
    return {
      symbol: symbol,
      underlying_symbol: underlying,
      option_type: type,
      strike_price: option.strikePrice || 0,
      expiration_date: expiration_date,
      days_to_expiration: option.daysToExpiration || 0,
      bid_price: option.bid,
      ask_price: option.ask,
      last_price: option.last,
      mark_price: option.mark,
      volume: option.totalVolume,
      open_interest: option.openInterest,
      delta: option.delta,
      gamma: option.gamma,
      theta: option.theta,
      vega: option.vega,
      rho: option.rho,
      implied_volatility: option.volatility,
      intrinsic_value: option.intrinsicValue,
      time_value: option.timeValue,
      quote_time: option.quoteTime ? new Date(option.quoteTime).toISOString() : undefined,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parse option symbol to extract strike price and type
   */
  private parse_option_symbol(symbol: string, underlying: string): { type: 'CALL' | 'PUT', strike: number } | null {
    // Format: UNDERLYINGYYMMDDC/PSTRIKE
    // e.g., QQQ241122C00450 for QQQ 11/22/24 450 CALL
    
    const underlying_len = underlying.length;
    const date_part = symbol.substring(underlying_len, underlying_len + 6);
    const type_char = symbol.charAt(underlying_len + 6);
    const strike_part = symbol.substring(underlying_len + 7);
    
    if (type_char !== 'C' && type_char !== 'P') {
      return null;
    }
    
    const strike = parseInt(strike_part) / 1000; // Convert from 00045000 to 450.00
    
    return {
      type: type_char === 'C' ? 'CALL' : 'PUT',
      strike: strike
    };
  }
}
