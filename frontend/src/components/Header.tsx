// import React from 'react'
import { format } from 'date-fns'
import { Quote } from '../types/data'

interface HeaderProps {
  currentTime: Date
  loading: boolean
  latestQuote?: Quote | null
}

export function Header({ currentTime, loading, latestQuote }: HeaderProps) {
  const formatTime = (date: Date) => {
    return format(date, 'MMM dd, yyyy - hh:mm:ss a')
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">K-Alpha Trading Dashboard</h1>
          <p className="text-blue-100">Real-time QQQ data with options chains and technical indicators</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <div className="text-2xl font-mono font-bold">
            {formatTime(currentTime)} EST
          </div>
          <div className="text-blue-100 text-sm">
            {loading ? 'Loading...' : 'Live Data'}
          </div>
          {latestQuote && (
            <div className="mt-2 text-sm">
              <div className="font-semibold">QQQ: ${latestQuote.last_price.toFixed(2)}</div>
              <div className="text-blue-200">
                Bid: ${latestQuote.bid.toFixed(2)} | Ask: ${latestQuote.ask.toFixed(2)}
              </div>
              <div className="text-blue-200">
                Volume: {latestQuote.volume.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
