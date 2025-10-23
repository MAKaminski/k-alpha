// import React from 'react'
import { format } from 'date-fns'
import { Quote } from '../types/data'

interface HeaderProps {
  currentTime: Date
  loading: boolean
  isLiveData?: boolean
  latestQuote?: Quote | null
}

export function Header({ currentTime, loading, isLiveData, latestQuote }: HeaderProps) {
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
          <div className="text-sm" data-testid="data-status">
            {isLiveData ? (
              <span className="text-cyan-400 font-bold animate-pulse" style={{ 
                textShadow: '0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 30px #06b6d4',
                filter: 'drop-shadow(0 0 5px #06b6d4)'
              }}>
                Live Data
              </span>
            ) : (
              <span className="text-gray-300">No Data</span>
            )}
          </div>
          {latestQuote && (
            <div className="mt-2 text-sm">
              <div className="font-semibold">QQQ: ${latestQuote.last_price ? parseFloat(latestQuote.last_price.toString()).toFixed(2) : 'N/A'}</div>
              <div className="text-blue-200">
                Bid: ${latestQuote.bid_price ? parseFloat(latestQuote.bid_price.toString()).toFixed(2) : 'N/A'} | Ask: ${latestQuote.ask_price ? parseFloat(latestQuote.ask_price.toString()).toFixed(2) : 'N/A'}
              </div>
              <div className="text-blue-200">
                Volume: {latestQuote.volume?.toLocaleString() || 'N/A'}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
