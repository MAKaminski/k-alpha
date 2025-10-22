// import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartData } from '../types/data'

interface VolumeChartProps {
  data: ChartData[]
}

export function VolumeChart({ data }: VolumeChartProps) {
  return (
    <div className="w-full h-48 bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Volume</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
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
