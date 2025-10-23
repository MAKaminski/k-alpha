import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'

interface OptionsChartData {
  timestamp: string
  time_label: string
  series_key: string
  option_type: 'CALL' | 'PUT'
  strike_price: number
  price: number
  volume: number
  open_interest: number
  delta: number
  gamma: number
  theta: number
  vega: number
  implied_volatility: number
}

interface OptionsChartProps {
  currentPrice: number
}

export function OptionsChart({ currentPrice }: OptionsChartProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [availableSeries, setAvailableSeries] = useState<string[]>([])
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<'CALL' | 'PUT' | 'BOTH'>('BOTH')
  const [selectedStrikes, setSelectedStrikes] = useState<Set<number>>(new Set())

  // Fetch options chart data
  const fetchOptionsData = async () => {
    try {
      setLoading(true)
      
      // Only fetch data for selected strikes and types
      let query = supabase
        .from('options_chart_data')
        .select('*')
        .gte('timestamp', new Date().toISOString().split('T')[0]) // Today's data
        .order('timestamp', { ascending: true })
        .limit(500) // Reduced limit

      // Filter by type if not BOTH
      if (selectedType !== 'BOTH') {
        query = query.eq('option_type', selectedType)
      }

      // Filter by selected strikes if any
      if (selectedStrikes.size > 0) {
        query = query.in('strike_price', Array.from(selectedStrikes))
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching options data:', error)
        setChartData([])
        setAvailableSeries([])
        return
      }

      if (!data || data.length === 0) {
        console.log('No options data available')
        setChartData([])
        setAvailableSeries([])
        return
      }

      // Process data into chart format
      const processedData = processOptionsData(data)
      setChartData(processedData)
      
      // Get available series from filtered data
      const series = Array.from(new Set(data.map(d => d.series_key)))
      setAvailableSeries(series)
      
      // Auto-select series if none selected
      if (visibleSeries.size === 0 && series.length > 0) {
        // Select strikes within ±$2 of current price
        const relevantSeries = series.filter(seriesKey => {
          const parts = seriesKey.split('_')
          const strike = parseFloat(parts[1])
          return Math.abs(strike - currentPrice) <= 2
        }).slice(0, 3) // Limit to 3 series max
        
        if (relevantSeries.length > 0) {
          setVisibleSeries(new Set(relevantSeries))
        } else if (series.length > 0) {
          // Fallback to first few series
          setVisibleSeries(new Set(series.slice(0, 3)))
        }
      }
      
    } catch (error) {
      console.error('Error fetching options data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Process raw options data into chart format
  const processOptionsData = (data: OptionsChartData[]) => {
    const timeMap = new Map<string, any>()
    
    data.forEach(d => {
      const timeKey = d.timestamp
      
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, {
          time: d.time_label,
          timestamp: d.timestamp
        })
      }
      
      const timeData = timeMap.get(timeKey)
      timeData[d.series_key] = d.price
    })
    
    return Array.from(timeMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }

  // Toggle series visibility
  const toggleSeries = (seriesKey: string) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seriesKey)) {
        newSet.delete(seriesKey)
      } else {
        newSet.add(seriesKey)
      }
      return newSet
    })
  }

  // Get series info for display
  const getSeriesInfo = (seriesKey: string) => {
    const parts = seriesKey.split('_')
    return {
      type: parts[0] as 'CALL' | 'PUT',
      strike: parseFloat(parts[1])
    }
  }

  // Generate colors for series
  const getSeriesColor = (seriesKey: string, index: number) => {
    const info = getSeriesInfo(seriesKey)
    const hue = index * 60 % 360
    return info.type === 'CALL' 
      ? `hsl(${hue}, 70%, 50%)` 
      : `hsl(${hue + 180}, 70%, 50%)`
  }

  useEffect(() => {
    fetchOptionsData()
    
    // Refresh data every 30 seconds (matches backend)
    const interval = setInterval(fetchOptionsData, 30000)
    return () => clearInterval(interval)
  }, []) // Remove currentPrice dependency to prevent excessive refetching

  // Refetch data when filters change
  useEffect(() => {
    // Only fetch if we have some strikes selected or if we're showing BOTH types
    if (selectedStrikes.size > 0 || selectedType === 'BOTH') {
      fetchOptionsData()
    }
  }, [selectedType, selectedStrikes])

  if (loading) {
    return (
      <div className="w-full h-48 bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading options data...</span>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-48 bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Options Prices</h3>
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No options data available</p>
        </div>
      </div>
    )
  }

  // Get unique strikes from available series
  const availableStrikes = Array.from(new Set(
    availableSeries.map(seriesKey => {
      const parts = seriesKey.split('_')
      return parseFloat(parts[1])
    })
  )).sort((a, b) => a - b)

  // Filter strikes by type
  const filteredStrikes = availableStrikes.filter(strike => {
    if (selectedType === 'BOTH') return true
    const hasCall = availableSeries.some(s => s.includes(`CALL_${strike}`))
    const hasPut = availableSeries.some(s => s.includes(`PUT_${strike}`))
    return selectedType === 'CALL' ? hasCall : hasPut
  })

  return (
    <div className="w-full h-64 bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Options Prices</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('CALL')}
              className={`px-3 py-1 text-sm rounded ${
                selectedType === 'CALL' 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              CALLS
            </button>
            <button
              onClick={() => setSelectedType('PUT')}
              className={`px-3 py-1 text-sm rounded ${
                selectedType === 'PUT' 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              PUTS
            </button>
            <button
              onClick={() => setSelectedType('BOTH')}
              className={`px-3 py-1 text-sm rounded ${
                selectedType === 'BOTH' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              BOTH
            </button>
          </div>
        </div>
        
        {/* Strike Selection */}
        <div className="flex flex-wrap gap-1 mb-3">
          {filteredStrikes.slice(0, 10).map(strike => {
            const isSelected = selectedStrikes.has(strike)
            const isNearPrice = Math.abs(strike - currentPrice) <= 2
            
            return (
              <button
                key={strike}
                onClick={() => {
                  const newSelected = new Set(selectedStrikes)
                  if (newSelected.has(strike)) {
                    newSelected.delete(strike)
                  } else {
                    newSelected.add(strike)
                  }
                  setSelectedStrikes(newSelected)
                }}
                className={`px-2 py-1 text-xs rounded border ${
                  isSelected 
                    ? 'bg-blue-100 text-blue-800 border-blue-300' 
                    : isNearPrice
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                ${strike}
              </button>
            )
          })}
        </div>
        
        {/* Selected Series Toggles */}
        {availableSeries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {availableSeries
              .filter(seriesKey => {
                const info = getSeriesInfo(seriesKey)
                if (selectedType !== 'BOTH' && info.type !== selectedType) return false
                if (selectedStrikes.size > 0 && !selectedStrikes.has(info.strike)) return false
                return true
              })
              .slice(0, 6) // Limit to 6 visible series
              .map((seriesKey, index) => {
                const info = getSeriesInfo(seriesKey)
                const isVisible = visibleSeries.has(seriesKey)
                const color = getSeriesColor(seriesKey, index)
                
                return (
                  <button
                    key={seriesKey}
                    onClick={() => toggleSeries(seriesKey)}
                    className={`px-2 py-1 text-xs rounded border ${
                      isVisible 
                        ? 'text-white border-transparent' 
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                    style={{ 
                      backgroundColor: isVisible ? color : undefined,
                    }}
                  >
                    {info.type} ${info.strike}
                  </button>
                )
              })}
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            type="category"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            label={{ value: 'Option Price ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">Time: {label}</p>
                    {payload.map((entry, index) => {
                      const seriesKey = entry.dataKey as string
                      const info = getSeriesInfo(seriesKey)
                      return (
                        <p key={index} style={{ color: entry.color }}>
                          {info.type} ${info.strike}: ${typeof entry.value === 'number' ? entry.value.toFixed(2) : 'N/A'}
                        </p>
                      )
                    })}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          
          {/* Render visible series */}
          {availableSeries.map((seriesKey, index) => {
            if (!visibleSeries.has(seriesKey)) return null
            
            const color = getSeriesColor(seriesKey, index)
            const info = getSeriesInfo(seriesKey)
            
            return (
              <Line
                key={seriesKey}
                type="monotone"
                dataKey={seriesKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                name={`${info.type} $${info.strike}`}
                connectNulls={false}
                strokeDasharray={info.type === 'CALL' ? '5 5' : '2 2'}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
