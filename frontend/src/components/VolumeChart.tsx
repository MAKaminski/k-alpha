// import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartData } from '../types/data'

interface VolumeChartProps {
  data: ChartData[]
}

export function VolumeChart({ data }: VolumeChartProps) {
  // Debug: Log volume data
  console.log('Volume chart data:', data.map(d => ({ time: d.time, volume: d.volume })).slice(0, 5))
  
  console.log('VolumeChart received data:', data.length, 'points')
  if (data.length > 0) {
    console.log('First volume data point:', data[0])
    console.log('Last volume data point:', data[data.length - 1])
    console.log('Sample volume data keys:', Object.keys(data[0]))
    console.log('Sample time values:', data.slice(0, 5).map(d => d.time))
  }

  // Filter out data points with null/undefined values for charting
  const validData = data.filter(d => {
    // Check for valid volume
    if (d.volume == null || d.volume < 0) return false
    
    // Check for valid time
    if (d.time == null || d.time === '') return false
    
    // Check for valid timestamp
    if (d.timestamp) {
      const date = new Date(d.timestamp)
      if (isNaN(date.getTime())) return false
    }
    
    return true
  })
  
  console.log('Valid volume data points after filtering:', validData.length, 'out of', data.length)

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

  return (
    <div className="w-full h-48 bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Volume (Per Interval)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={completeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            type="category"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ value: 'Volume', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">Time: {label}</p>
                    <p style={{ color: payload[0].color }}>
                      Volume (Interval): {payload[0].value?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Incremental volume for this period
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar 
            dataKey="volume" 
            fill="#3b82f6"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
