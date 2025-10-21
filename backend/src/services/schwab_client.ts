import { CONSTANTS } from '../config/constants.js';

interface QuoteData {
  symbol: string;
  bid_price: number;
  ask_price: number;
  last_price: number;
  volume: number;
  timestamp: Date;
}

interface SchwabQuoteResponse {
  [symbol: string]: {
    quote?: {
      bidPrice?: number;
      askPrice?: number;
      lastPrice?: number;
      totalVolume?: number;
      quoteTime?: number;
    };
  };
}

export class SchwabClient {
  private access_token: string;

  constructor(access_token: string) {
    this.access_token = access_token;
  }

  async fetch_quote(symbol: string): Promise<QuoteData> {
    const url = `${CONSTANTS.SCHWAB_API_BASE_URL}/quotes?symbols=${symbol}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Schwab API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as SchwabQuoteResponse;
    const quote = data[symbol]?.quote;

    if (!quote) {
      throw new Error(`No quote data for ${symbol}`);
    }

    return {
      symbol,
      bid_price: quote.bidPrice || 0,
      ask_price: quote.askPrice || 0,
      last_price: quote.lastPrice || 0,
      volume: quote.totalVolume || 0,
      timestamp: new Date(quote.quoteTime || Date.now())
    };
  }
}

