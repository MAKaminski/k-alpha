import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CrossoverSignal } from '../types/data';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface CrossoverWidgetProps {
  symbol: string;
  sessionDate: string;
}

export function CrossoverWidget({ symbol, sessionDate }: CrossoverWidgetProps) {
  const [crossoverCount, setCrossoverCount] = useState(0);
  const [bullishCount, setBullishCount] = useState(0);
  const [bearishCount, setBearishCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastCrossover, setLastCrossover] = useState<CrossoverSignal | null>(null);

  const fetchCrossoverData = async () => {
    try {
      // Get crossover count for the session
      const { data: crossovers, error } = await supabase
        .from('crossover_signals')
        .select('*')
        .eq('symbol', symbol)
        .eq('session_date', sessionDate)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching crossover data:', error);
        return;
      }

      const totalCount = crossovers?.length || 0;
      const bullish = crossovers?.filter(c => c.signal_type === 'BULLISH').length || 0;
      const bearish = crossovers?.filter(c => c.signal_type === 'BEARISH').length || 0;

      setCrossoverCount(totalCount);
      setBullishCount(bullish);
      setBearishCount(bearish);
      setLastCrossover(crossovers?.[0] || null);
    } catch (error) {
      console.error('Error fetching crossover data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrossoverData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchCrossoverData, 5000);
    return () => clearInterval(interval);
  }, [symbol, sessionDate]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading crossover data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6" data-testid="crossover-widget">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Target className="h-5 w-5 mr-2 text-blue-600" />
          VWAP Crossovers
        </h3>
        <div className="text-sm text-gray-500">
          {sessionDate}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Target className="h-4 w-4 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Total Crossovers</span>
          </div>
          <p className="text-2xl font-bold text-gray-800" data-testid="total-crossovers">
            {crossoverCount}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-700">Bullish (UP)</span>
          </div>
          <p className="text-2xl font-bold text-green-800" data-testid="bullish-crossovers">
            {bullishCount}
          </p>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-700">Bearish (DOWN)</span>
          </div>
          <p className="text-2xl font-bold text-red-800" data-testid="bearish-crossovers">
            {bearishCount}
          </p>
        </div>
      </div>

      {lastCrossover && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span className="font-medium">Last Crossover:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                lastCrossover.signal_type === 'BULLISH' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {lastCrossover.signal_type} {lastCrossover.crossover_direction}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Price: ${lastCrossover.price_at_crossover.toFixed(2)} at {formatTime(lastCrossover.timestamp)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
