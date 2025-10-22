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

  // Process options data for individual series
  const dataWithOptionPrices = data.map(d => {
    // Group calls by strike price for individual series
    const callsByStrike = d.calls.reduce((acc, call) => {
      const strike = call.strike_price
      if (!acc[strike]) {
        acc[strike] = []
      }
      acc[strike].push(call)
      return acc
    }, {} as { [strike: number]: any[] })

    // Group puts by strike price for individual series
    const putsByStrike = d.puts.reduce((acc, put) => {
      const strike = put.strike_price
      if (!acc[strike]) {
        acc[strike] = []
      }
      acc[strike].push(put)
      return acc
    }, {} as { [strike: number]: any[] })

    // Create individual option series data
    const optionSeries = {
      ...d,
      callCount: d.calls.length,
      putCount: d.puts.length,
      callsByStrike,
      putsByStrike
    }

    return optionSeries
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
            tickFormatter={(value) => `$${Math.round(value)}`}
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
          
          {showOptions && dataWithOptionPrices.length > 0 && (() => {
            // Get all unique strike prices from the first data point
            const firstData = dataWithOptionPrices[0]
            const allStrikes = new Set<number>()
            
            dataWithOptionPrices.forEach(d => {
              Object.keys(d.callsByStrike).forEach(strike => allStrikes.add(parseFloat(strike)))
              Object.keys(d.putsByStrike).forEach(strike => allStrikes.add(parseFloat(strike)))
            })
            
            const strikes = Array.from(allStrikes).sort((a, b) => a - b)
            
            return (
              <>
                {strikes.slice(0, 5).map((strike, index) => (
                  <Line
                    key={`call-${strike}`}
                    yAxisId="options"
                    type="monotone"
                    dataKey={(d: any) => {
                      const calls = d.callsByStrike[strike] || []
                      if (calls.length === 0) return null
                      const prices = calls.map((c: any) => [c.bid_price, c.ask_price, c.last_price, c.mark_price])
                        .flat()
                        .filter((p: any) => p !== null && p !== undefined && p > 0)
                      return prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : null
                    }}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={1}
                    dot={false}
                    name={`Call $${strike}`}
                    connectNulls={false}
                  />
                ))}
                {strikes.slice(0, 5).map((strike, index) => (
                  <Line
                    key={`put-${strike}`}
                    yAxisId="options"
                    type="monotone"
                    dataKey={(d: any) => {
                      const puts = d.putsByStrike[strike] || []
                      if (puts.length === 0) return null
                      const prices = puts.map((p: any) => [p.bid_price, p.ask_price, p.last_price, p.mark_price])
                        .flat()
                        .filter((p: any) => p !== null && p !== undefined && p > 0)
                      return prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : null
                    }}
                    stroke={`hsl(${index * 60 + 180}, 70%, 50%)`}
                    strokeWidth={1}
                    dot={false}
                    name={`Put $${strike}`}
                    connectNulls={false}
                  />
                ))}
              </>
            )
          })()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
