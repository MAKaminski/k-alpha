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
   * Calculate strike prices for ATM ±5 strikes
   */
  private calculate_strikes(current_price: number): number[] {
    const strikes: number[] = [];
    
    // Round current price to nearest $0.50 for options
    const rounded_price = Math.round(current_price * 2) / 2;
    
    // Generate strikes: ATM-5, ATM-4, ..., ATM, ..., ATM+4, ATM+5
    for (let i = -5; i <= 5; i++) {
      strikes.push(rounded_price + (i * 0.5));
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
    const strikes = this.calculate_strikes(current_price);
    const today_str = this.get_today_date_string();
    const option_symbols = this.generate_option_symbols(underlying, strikes, today_str);
    
    // Split into chunks of 50 (Schwab API limit)
    const chunks = [];
    for (let i = 0; i < option_symbols.length; i += 50) {
      chunks.push(option_symbols.slice(i, i + 50));
    }
    
    const all_options: OptionData[] = [];
    
    for (const chunk of chunks) {
      const options = await this.fetch_options_batch(chunk, underlying, today_str);
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
