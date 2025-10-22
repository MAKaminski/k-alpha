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
  const validData = data.filter(d => 
    d.volume != null && 
    d.volume >= 0 && 
    d.time != null && 
    d.time !== ''
  )
  
  console.log('Valid volume data points after filtering:', validData.length, 'out of', data.length)

  // Create a complete dataset with all market hours (9am-4pm) filled in
  const createCompleteDataset = () => {
    const completeData = []
    
    // Create entries for every 30 minutes from 9am to 4pm
    for (let hour = 9; hour <= 16; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeLabel = `${hour}:${minute.toString().padStart(2, '0')}:00`
        
        // Find matching data point or create empty one
        const matchingData = validData.find(d => {
          // Try to match time format - could be "Xm Ys ago" or "HH:MM:SS"
          if (d.time.includes(':')) {
            return d.time.startsWith(timeLabel.substring(0, 5)) // Match HH:MM
          }
          return false
        })
        
        if (matchingData) {
          completeData.push({
            ...matchingData,
            time: timeLabel // Standardize time format
          })
        } else {
          // Create empty data point for missing time slots
          completeData.push({
            time: timeLabel,
            volume: 0
          })
        }
      }
    }
    
    return completeData
  }
  
  const completeData = createCompleteDataset()

  return (
    <div className="w-full h-48 bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Volume (Interval)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={completeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            domain={['9:00:00', '16:00:00']}
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
                      Volume: {payload[0].value?.toLocaleString()}
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
