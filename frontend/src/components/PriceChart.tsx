import React, { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Scatter } from 'recharts'
import { ChartData } from '../types/data'

interface PriceChartProps {
  data: ChartData[]
  showPrice: boolean
  showSMA9: boolean
  showVWAP: boolean
  showOptions: boolean
}

export function PriceChart({ data, showPrice, showSMA9, showVWAP, showOptions }: PriceChartProps) {
  // State for toggling individual option series
  const [visibleOptions, setVisibleOptions] = useState<Set<string>>(new Set())
  
  // Process options data and create series
  const optionsSeries = useMemo(() => {
    if (!showOptions) return []
    
    const seriesMap = new Map<string, { strike: number, type: 'CALL' | 'PUT', data: any[] }>()
    
    data.forEach(d => {
      // Process calls
      d.calls?.forEach(call => {
        const key = `CALL_${call.strike_price}`
        if (!seriesMap.has(key)) {
          seriesMap.set(key, { strike: call.strike_price, type: 'CALL', data: [] })
        }
        seriesMap.get(key)!.data.push({
          time: d.time,
          price: call.last_price || call.mark_price || call.bid_price || 0,
          volume: call.volume || 0,
          openInterest: call.open_interest || 0
        })
      })
      
      // Process puts
      d.puts?.forEach(put => {
        const key = `PUT_${put.strike_price}`
        if (!seriesMap.has(key)) {
          seriesMap.set(key, { strike: put.strike_price, type: 'PUT', data: [] })
        }
        seriesMap.get(key)!.data.push({
          time: d.time,
          price: put.last_price || put.mark_price || put.bid_price || 0,
          volume: put.volume || 0,
          openInterest: put.open_interest || 0
        })
      })
    })
    
    return Array.from(seriesMap.entries()).map(([key, series]) => ({
      key,
      strike: series.strike,
      type: series.type,
      data: series.data,
      visible: visibleOptions.has(key)
    }))
  }, [data, showOptions, visibleOptions])
  
  // Initialize visible options to ±1 strikes around current price
  React.useEffect(() => {
    if (data.length > 0 && optionsSeries.length > 0) {
      const currentPrice = data[data.length - 1]?.last_price || 0
      const newVisible = new Set<string>()
      
      optionsSeries.forEach(series => {
        const diff = Math.abs(series.strike - currentPrice)
        if (diff <= 1) { // Within $1 of current price
          newVisible.add(series.key)
        }
      })
      
      if (newVisible.size > 0) {
        setVisibleOptions(newVisible)
      }
    }
  }, [data, optionsSeries])
  
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

  const toggleOptionSeries = (key: string) => {
    setVisibleOptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">QQQ Price & Options</h3>
        {showOptions && optionsSeries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {optionsSeries.map(series => (
              <button
                key={series.key}
                onClick={() => toggleOptionSeries(series.key)}
                className={`px-2 py-1 text-xs rounded ${
                  series.visible 
                    ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {series.type} ${series.strike}
              </button>
            ))}
          </div>
        )}
      </div>
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
          
          {/* Options series */}
          {showOptions && optionsSeries.map(series => {
            if (!series.visible) return null
            
            const color = series.type === 'CALL' ? '#3b82f6' : '#ef4444'
            const strokeDash = series.type === 'CALL' ? '5 5' : '2 2'
            
            return (
              <Line
                key={series.key}
                yAxisId="options"
                type="monotone"
                dataKey={(d: any) => {
                  const point = series.data.find(sd => sd.time === d.time)
                  return point ? point.price : null
                }}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                name={`${series.type} $${series.strike}`}
                connectNulls={false}
                strokeDasharray={strokeDash}
                data={dataWithOptionPrices}
              />
            )
          })}
          
          {/* Crossover markers */}
          <Scatter
            yAxisId="price"
            data={dataWithOptionPrices.filter(d => d.crossover).map(d => ({
              time: d.time,
              price: d.crossover!.price_at_crossover,
              signal_type: d.crossover!.signal_type,
              crossover_direction: d.crossover!.crossover_direction
            }))}
            fill="#8884d8"
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const isBullish = payload?.signal_type === 'BULLISH';
              const color = isBullish ? '#10b981' : '#ef4444';
              const symbol = isBullish ? '▲' : '▼';
              
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {symbol}
                  </text>
                </g>
              );
            }}
          />
        </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
