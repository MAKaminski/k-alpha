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
  // Calculate price range for left axis including all price data (QQQ, SMA9, VWAP)
  const allPrices = data.flatMap(d => [
    d.last_price,
    d.sma9,
    d.session_vwap
  ]).filter((price): price is number => price !== null && price !== undefined && !isNaN(price))
  
  // If no valid prices, use a default range
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 600
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 610
  
  // Add +/- $1 buffer rounded to nearest dollar
  const minPriceRounded = Math.floor(minPrice) - 1
  const maxPriceRounded = Math.ceil(maxPrice) + 1

  // Remove artificial time generation - let the chart use actual data range

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
  console.log('PriceChart received data:', data.length, 'points')
  if (data.length > 0) {
    console.log('First data point:', data[0])
    console.log('Last data point:', data[data.length - 1])
    console.log('Sample data keys:', Object.keys(data[0]))
    console.log('Sample time values:', data.slice(0, 5).map(d => d.time))
    console.log('Sample last_price values:', data.slice(0, 5).map(d => d.last_price))
    console.log('Sample sma9 values:', data.slice(0, 5).map(d => d.sma9))
    console.log('Sample session_vwap values:', data.slice(0, 5).map(d => d.session_vwap))
  }

  // Filter out data points with invalid price or time values
  // Allow null sma9 and session_vwap values as they may not be available initially
  const validData = data.filter(d => {
    // Check for valid price
    if (d.last_price == null || d.last_price <= 0) return false
    
    // Check for valid time
    if (d.time == null || d.time === '') return false
    
    // Check for valid timestamp
    if (d.timestamp) {
      const date = new Date(d.timestamp)
      if (isNaN(date.getTime())) return false
    }
    
    return true
  })
  
  console.log('Valid data points after filtering:', validData.length, 'out of', data.length)
  if (validData.length > 0) {
    console.log('First valid data point:', validData[0])
    console.log('Last valid data point:', validData[validData.length - 1])
  } else {
    console.log('No valid data points found!')
    console.log('Sample invalid data:', data.slice(0, 3).map(d => ({
      time: d.time,
      last_price: d.last_price,
      sma9: d.sma9,
      session_vwap: d.session_vwap
    })))
  }

  // Create a dataset with only actual data points
  const createCompleteDataset = () => {
    if (validData.length === 0) return []
    
    // Sort the valid data by timestamp
    const sortedData = [...validData].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      return timeA - timeB
    })
    
    // Return only the actual data points with proper time formatting
    return sortedData.map(d => ({
      ...d,
      time: d.time // Keep the original time format
    }))
  }
  
  const completeData = createCompleteDataset()
  
  const dataWithOptionPrices = completeData.map(d => {
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

  // Debug: Log the final data being passed to the chart
  console.log('Chart data being passed to LineChart:', dataWithOptionPrices.length, 'points')
  if (dataWithOptionPrices.length > 0) {
    console.log('First chart data point:', dataWithOptionPrices[0])
    console.log('Last chart data point:', dataWithOptionPrices[dataWithOptionPrices.length - 1])
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">QQQ Price & Options</h3>
      {validData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithOptionPrices}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            type="category"
          />
          {/* Removed artificial reference areas - let chart use actual data range */}
          <YAxis 
            yAxisId="price"
            orientation="left"
            domain={[minPriceRounded, maxPriceRounded]}
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
              connectNulls={false}
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
              connectNulls={false}
            />
          )}
          
          {showOptions && dataWithOptionPrices.length > 0 && (() => {
            // Debug: Log options data
            console.log('Options data for chart:', dataWithOptionPrices.map(d => ({
              time: d.time,
              calls: d.calls.length,
              puts: d.puts.length,
              callStrikes: d.calls.map(c => c.strike_price),
              putStrikes: d.puts.map(p => p.strike_price)
            })).slice(0, 3))
            
            // Get all unique strike prices from all data points
            const allStrikes = new Set<number>()
            
            dataWithOptionPrices.forEach(d => {
              d.calls.forEach(call => allStrikes.add(call.strike_price))
              d.puts.forEach(put => allStrikes.add(put.strike_price))
            })
            
            const strikes = Array.from(allStrikes).sort((a, b) => a - b)
            console.log('All strikes found:', strikes)
            
            // Only show strikes closest to current price
            const currentPrice = dataWithOptionPrices[dataWithOptionPrices.length - 1]?.last_price || 0
            const relevantStrikes = strikes
              .filter(strike => Math.abs(strike - currentPrice) <= 20) // Within $20 of current price
              .slice(0, 3) // Show max 3 strikes
            
            console.log('Relevant strikes for current price', currentPrice, ':', relevantStrikes)
            
            if (relevantStrikes.length === 0) {
              console.log('No relevant strikes found for options plotting')
              return null
            }
            
            return (
              <>
                {relevantStrikes.map((strike, index) => (
                  <Line
                    key={`call-${strike}`}
                    yAxisId="options"
                    type="monotone"
                    dataKey={(d: any) => {
                      const calls = d.calls.filter((c: any) => c.strike_price === strike)
                      if (calls.length === 0) return null
                      const prices = calls.map((c: any) => [c.bid_price, c.ask_price, c.last_price, c.mark_price])
                        .flat()
                        .filter((p: any) => p !== null && p !== undefined && p > 0)
                      const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : null
                      console.log(`Call ${strike} at ${d.time}:`, avgPrice)
                      return avgPrice
                    }}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={false}
                    name={`Call $${strike}`}
                    connectNulls={false}
                  />
                ))}
                {relevantStrikes.map((strike, index) => (
                  <Line
                    key={`put-${strike}`}
                    yAxisId="options"
                    type="monotone"
                    dataKey={(d: any) => {
                      const puts = d.puts.filter((p: any) => p.strike_price === strike)
                      if (puts.length === 0) return null
                      const prices = puts.map((p: any) => [p.bid_price, p.ask_price, p.last_price, p.mark_price])
                        .flat()
                        .filter((p: any) => p !== null && p !== undefined && p > 0)
                      const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : null
                      console.log(`Put ${strike} at ${d.time}:`, avgPrice)
                      return avgPrice
                    }}
                    stroke={`hsl(${index * 60 + 180}, 70%, 50%)`}
                    strokeWidth={2}
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
      )}
    </div>
  )
}
