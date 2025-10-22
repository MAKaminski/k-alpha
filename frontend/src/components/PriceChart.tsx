import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartData } from '../types/data'

interface PriceChartProps {
  data: ChartData[]
  showPrice: boolean
  showSMA9: boolean
  showVWAP: boolean
  showOptions: boolean
}

export function PriceChart({ data, showPrice, showSMA9, showVWAP, showOptions }: PriceChartProps) {
  // Calculate price range for left axis
  const prices = data.map(d => d.last_price).filter(Boolean)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice
  const padding = priceRange * 0.1

  // Calculate options price range for right axis
  const allOptions = data.flatMap(d => [...d.calls, ...d.puts])
  const optionPrices = allOptions
    .map(o => [o.bid_price, o.ask_price, o.last_price, o.mark_price])
    .flat()
    .filter((p): p is number => p !== null && p !== undefined && p > 0)
  
  const minOptionPrice = optionPrices.length > 0 ? Math.min(...optionPrices) : 0
  const maxOptionPrice = optionPrices.length > 0 ? Math.max(...optionPrices) : 10
  const optionRange = maxOptionPrice - minOptionPrice
  const optionPadding = optionRange * 0.1

  // Calculate average option prices for each data point
  const dataWithOptionPrices = data.map(d => {
    const callPrices = d.calls
      .map(c => [c.bid_price, c.ask_price, c.last_price, c.mark_price])
      .flat()
      .filter((p): p is number => p !== null && p !== undefined && p > 0)
    
    const putPrices = d.puts
      .map(p => [p.bid_price, p.ask_price, p.last_price, p.mark_price])
      .flat()
      .filter((p): p is number => p !== null && p !== undefined && p > 0)
    
    const avgCallPrice = callPrices.length > 0 ? callPrices.reduce((a, b) => a + b, 0) / callPrices.length : null
    const avgPutPrice = putPrices.length > 0 ? putPrices.reduce((a, b) => a + b, 0) / putPrices.length : null
    
    return {
      ...d,
      avgCallPrice,
      avgPutPrice,
      callCount: d.calls.length,
      putCount: d.puts.length
    }
  })

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">QQQ Price & Options</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataWithOptionPrices}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            yAxisId="price"
            orientation="left"
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 12 }}
            label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="options"
            orientation="right"
            domain={[Math.max(0, minOptionPrice - optionPadding), maxOptionPrice + optionPadding]}
            tick={{ fontSize: 12 }}
            label={{ value: 'Options ($)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">Time: {label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                      </p>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          
          {showPrice && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="last_price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="QQQ Price"
            />
          )}
          
          {showSMA9 && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="sma9"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              name="SMA9"
            />
          )}
          
          {showVWAP && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="session_vwap"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              name="Session VWAP"
            />
          )}
          
          {showOptions && (
            <>
              <Line
                yAxisId="options"
                type="monotone"
                dataKey="avgCallPrice"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Avg Call Price"
              />
              <Line
                yAxisId="options"
                type="monotone"
                dataKey="avgPutPrice"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Avg Put Price"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
