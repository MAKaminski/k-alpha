'use client';

import { useEffect, useState } from 'react';
import { supabase, Quote } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const format_time = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
};

export default function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [latest, setLatest] = useState<Quote | null>(null);

  useEffect(() => {
    fetch_quotes();
    
    const subscription = supabase
      .channel('quotes_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quotes' },
        (payload) => {
          const new_quote = payload.new as Quote;
          setQuotes((prev) => [...prev.slice(-99), new_quote]);
          setLatest(new_quote);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetch_quotes = async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (data && !error) {
      setQuotes(data.reverse());
      setLatest(data[0]);
    }
  };

  const chart_data = quotes.map(q => ({
    time: format_time(q.timestamp),
    price: Number(q.last_price)
  }));

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>K-Alpha</h1>
      
      {latest && (
        <div style={{ 
          padding: '1.5rem', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#666' }}>
            {latest.symbol}
          </h2>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
            ${Number(latest.last_price).toFixed(2)}
          </div>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>
            <div>Bid: ${Number(latest.bid_price).toFixed(2)} | Ask: ${Number(latest.ask_price).toFixed(2)}</div>
            <div>Volume: {Number(latest.volume).toLocaleString()}</div>
            <div>Updated: {format_time(latest.timestamp)}</div>
          </div>
        </div>
      )}

      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0 }}>Price Chart (Last 100 quotes)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chart_data}>
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

