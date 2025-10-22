import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface CrossoverSignal {
  symbol: string;
  timestamp: string;
  last_price: number;
  sma9: number;
  session_vwap: number;
  signal_type: 'BULLISH' | 'BEARISH';
  crossover_direction: 'UP' | 'DOWN';
  price_at_crossover: number;
  sma9_at_crossover: number;
  vwap_at_crossover: number;
  previous_sma9: number | null;
  previous_vwap: number | null;
  is_market_hours: boolean;
  session_date: string;
}

interface IndicatorData {
  symbol: string;
  timestamp: string;
  last_price: number;
  sma9: number | null;
  session_vwap: number | null;
  is_market_hours: boolean;
  session_date: string;
}

export class CrossoverDetector {
  private supabase: SupabaseClient;
  private lastIndicator: IndicatorData | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Process new indicator data and detect crossovers
   */
  async processIndicatorData(indicator: IndicatorData): Promise<CrossoverSignal | null> {
    // Skip if we don't have both SMA9 and VWAP values
    if (indicator.sma9 === null || indicator.session_vwap === null) {
      this.lastIndicator = indicator;
      return null;
    }

    // Skip if this is the first data point
    if (this.lastIndicator === null) {
      this.lastIndicator = indicator;
      return null;
    }

    // Skip if previous data point didn't have both values
    if (this.lastIndicator.sma9 === null || this.lastIndicator.session_vwap === null) {
      this.lastIndicator = indicator;
      return null;
    }

    // Detect crossover
    const crossover = this.detectCrossover(this.lastIndicator, indicator);
    
    // Update last indicator
    this.lastIndicator = indicator;

    if (crossover) {
      // Store the crossover signal
      await this.storeCrossoverSignal(crossover);
      return crossover;
    }

    return null;
  }

  /**
   * Detect if SMA9 crossed over Session VWAP
   */
  private detectCrossover(previous: IndicatorData, current: IndicatorData): CrossoverSignal | null {
    const prevSMA9 = previous.sma9!;
    const prevVWAP = previous.session_vwap!;
    const currSMA9 = current.sma9!;
    const currVWAP = current.session_vwap!;

    // Check for upward crossover (SMA9 crosses above VWAP) - BULLISH
    if (prevSMA9 <= prevVWAP && currSMA9 > currVWAP) {
      return {
        symbol: current.symbol,
        timestamp: current.timestamp,
        last_price: current.last_price,
        sma9: currSMA9,
        session_vwap: currVWAP,
        signal_type: 'BULLISH',
        crossover_direction: 'UP',
        price_at_crossover: current.last_price,
        sma9_at_crossover: currSMA9,
        vwap_at_crossover: currVWAP,
        previous_sma9: prevSMA9,
        previous_vwap: prevVWAP,
        is_market_hours: current.is_market_hours,
        session_date: current.session_date
      };
    }

    // Check for downward crossover (SMA9 crosses below VWAP) - BEARISH
    if (prevSMA9 >= prevVWAP && currSMA9 < currVWAP) {
      return {
        symbol: current.symbol,
        timestamp: current.timestamp,
        last_price: current.last_price,
        sma9: currSMA9,
        session_vwap: currVWAP,
        signal_type: 'BEARISH',
        crossover_direction: 'DOWN',
        price_at_crossover: current.last_price,
        sma9_at_crossover: currSMA9,
        vwap_at_crossover: currVWAP,
        previous_sma9: prevSMA9,
        previous_vwap: prevVWAP,
        is_market_hours: current.is_market_hours,
        session_date: current.session_date
      };
    }

    return null;
  }

  /**
   * Store crossover signal in database
   */
  private async storeCrossoverSignal(signal: CrossoverSignal): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('crossover_signals')
        .insert(signal);

      if (error) {
        throw new Error(`Failed to store crossover signal: ${error.message}`);
      }

      console.log(`📈 Crossover signal stored: ${signal.signal_type} at $${signal.price_at_crossover} (SMA9: $${signal.sma9_at_crossover}, VWAP: $${signal.vwap_at_crossover})`);
    } catch (error) {
      console.error('Error storing crossover signal:', error);
      throw error;
    }
  }

  /**
   * Get recent crossover signals
   */
  async getRecentSignals(symbol: string, limit: number = 10): Promise<CrossoverSignal[]> {
    try {
      const { data, error } = await this.supabase
        .from('crossover_signals')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch crossover signals: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching crossover signals:', error);
      throw error;
    }
  }

  /**
   * Get signals by type
   */
  async getSignalsByType(symbol: string, signalType: 'BULLISH' | 'BEARISH', limit: number = 10): Promise<CrossoverSignal[]> {
    try {
      const { data, error } = await this.supabase
        .from('crossover_signals')
        .select('*')
        .eq('symbol', symbol)
        .eq('signal_type', signalType)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch ${signalType} signals: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Error fetching ${signalType} signals:`, error);
      throw error;
    }
  }

  /**
   * Get signals for a specific session
   */
  async getSignalsForSession(symbol: string, sessionDate: string): Promise<CrossoverSignal[]> {
    try {
      const { data, error } = await this.supabase
        .from('crossover_signals')
        .select('*')
        .eq('symbol', symbol)
        .eq('session_date', sessionDate)
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch signals for session ${sessionDate}: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Error fetching signals for session ${sessionDate}:`, error);
      throw error;
    }
  }

  /**
   * Get signal statistics
   */
  async getSignalStatistics(symbol: string, days: number = 30): Promise<{
    totalSignals: number;
    bullishSignals: number;
    bearishSignals: number;
    bullishPercentage: number;
    bearishPercentage: number;
    lastSignal: CrossoverSignal | null;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('crossover_signals')
        .select('*')
        .eq('symbol', symbol)
        .gte('session_date', startDateStr)
        .order('timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch signal statistics: ${error.message}`);
      }

      const signals = data || [];
      const bullishSignals = signals.filter(s => s.signal_type === 'BULLISH').length;
      const bearishSignals = signals.filter(s => s.signal_type === 'BEARISH').length;
      const totalSignals = signals.length;

      return {
        totalSignals,
        bullishSignals,
        bearishSignals,
        bullishPercentage: totalSignals > 0 ? (bullishSignals / totalSignals) * 100 : 0,
        bearishPercentage: totalSignals > 0 ? (bearishSignals / totalSignals) * 100 : 0,
        lastSignal: signals[0] || null
      };
    } catch (error) {
      console.error('Error fetching signal statistics:', error);
      throw error;
    }
  }
}
