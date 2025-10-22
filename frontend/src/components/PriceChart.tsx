// import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from 'recharts'
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

  // Get current date for trading hours calculation
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Calculate trading hours (9am-4pm EST, with 1hr buffer on each side = 8am-5pm)
  const tradingStart = new Date(today.getTime() + 9 * 60 * 60 * 1000) // 9am EST
  const tradingEnd = new Date(today.getTime() + 15 * 60 * 60 * 1000) // 3pm EST
  const marketClose = new Date(today.getTime() + 16 * 60 * 60 * 1000) // 4pm EST
  
  // Format times for chart
  const formatTimeForChart = (date: Date) => {
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffSeconds = Math.floor((diffMs % 60000) / 1000)
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s ago`
    } else {
      return `${diffSeconds}s ago`
    }
  }

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
          {/* Highlight trading hours (9am-10am and 3pm-4pm) */}
          <ReferenceArea 
            x1={formatTimeForChart(tradingStart)} 
            x2={formatTimeForChart(new Date(today.getTime() + 10 * 60 * 60 * 1000))} 
            y1={minPrice - padding} 
            y2={maxPrice + padding} 
            fill="rgba(128, 128, 128, 0.1)" 
            stroke="rgba(128, 128, 128, 0.3)"
            strokeDasharray="2 2"
          />
          <ReferenceArea 
            x1={formatTimeForChart(tradingEnd)} 
            x2={formatTimeForChart(marketClose)} 
            y1={minPrice - padding} 
            y2={maxPrice + padding} 
            fill="rgba(128, 128, 128, 0.1)" 
            stroke="rgba(128, 128, 128, 0.3)"
            strokeDasharray="2 2"
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
