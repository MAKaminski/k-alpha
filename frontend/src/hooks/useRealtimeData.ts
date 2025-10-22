import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Quote, Indicator, Option, ChartData } from '../types/data'
// import { format } from 'date-fns'

export function useRealtimeData() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [latestQuote, setLatestQuote] = useState<Quote | null>(null)

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      
      // Update time labels for chart data
      setChartData(prev => {
        const now = new Date()
        return prev.map(item => {
          const time = new Date(item.timestamp)
          const diffMs = now.getTime() - time.getTime()
          const diffMinutes = Math.floor(diffMs / 60000)
          const diffSeconds = Math.floor((diffMs % 60000) / 1000)
          
          let timeLabel: string
          if (diffMinutes > 0) {
            timeLabel = `${diffMinutes}m ${diffSeconds}s ago`
          } else {
            timeLabel = `${diffSeconds}s ago`
          }
          
          return {
            ...item,
            time: timeLabel
          }
        })
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch initial data
  useEffect(() => {
    fetchInitialData()
  }, [])

  // Set up real-time subscriptions
  useEffect(() => {
    const quotesSubscription = supabase
      .channel('quotes-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'quotes' },
        handleNewQuote
      )
      .subscribe()

    const indicatorsSubscription = supabase
      .channel('indicators-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'indicators' },
        handleNewIndicator
      )
      .subscribe()

    const optionsSubscription = supabase
      .channel('options-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'options' },
        handleNewOption
      )
      .subscribe()

    return () => {
      quotesSubscription.unsubscribe()
      indicatorsSubscription.unsubscribe()
      optionsSubscription.unsubscribe()
    }
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      
      // Fetch last 100 data points
      const [quotesResult, indicatorsResult, optionsResult] = await Promise.all([
        supabase
          .from('quotes')
          .select('*')
          .eq('symbol', 'QQQ')
          .order('timestamp', { ascending: false })
          .limit(100),
        
        supabase
          .from('indicators')
          .select('*')
          .eq('symbol', 'QQQ')
          .order('timestamp', { ascending: false })
          .limit(100),
        
        supabase
          .from('options')
          .select('*')
          .eq('underlying_symbol', 'QQQ')
          .order('timestamp', { ascending: false })
          .limit(1000)
      ])

      if (quotesResult.error) throw quotesResult.error
      if (indicatorsResult.error) throw indicatorsResult.error
      if (optionsResult.error) throw optionsResult.error

      const quotes = quotesResult.data as Quote[]
      const indicators = indicatorsResult.data as Indicator[]
      const options = optionsResult.data as Option[]

      // Combine and process data
      const combinedData = combineData(quotes, indicators, options)
      setChartData(combinedData)
      
      // Set latest quote for display
      if (quotes.length > 0) {
        setLatestQuote(quotes[0])
      }
      
    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const combineData = (quotes: Quote[], indicators: Indicator[], options: Option[]): ChartData[] => {
    // Create a map of timestamps to data points
    const dataMap = new Map<string, ChartData>()
    const now = new Date()

    // Process quotes
    quotes.forEach(quote => {
      const time = new Date(quote.timestamp)
      const key = time.toISOString()
      
      // Calculate relative time from now
      const diffMs = now.getTime() - time.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      const diffSeconds = Math.floor((diffMs % 60000) / 1000)
      
      let timeLabel: string
      if (diffMinutes > 0) {
        timeLabel = `${diffMinutes}m ${diffSeconds}s ago`
      } else {
        timeLabel = `${diffSeconds}s ago`
      }
      
      dataMap.set(key, {
        timestamp: quote.timestamp,
        time: timeLabel,
        last_price: quote.last_price,
        sma9: null,
        session_vwap: null,
        volume: quote.volume,
        calls: [],
        puts: [],
        bid: quote.bid_price,
        ask: quote.ask_price
      })
    })

    // Process indicators
    indicators.forEach(indicator => {
      const time = new Date(indicator.timestamp)
      const key = time.toISOString()
      
      const existing = dataMap.get(key)
      if (existing) {
        existing.sma9 = indicator.sma9
        existing.session_vwap = indicator.session_vwap
        existing.volume = indicator.volume
      }
    })

    // Process options
    options.forEach(option => {
      const time = new Date(option.timestamp)
      const key = time.toISOString()
      
      const existing = dataMap.get(key)
      if (existing) {
        if (option.option_type === 'CALL') {
          existing.calls.push(option)
        } else {
          existing.puts.push(option)
        }
      }
    })

    // Convert to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-100) // Keep last 100 points
  }

  const handleNewQuote = (payload: any) => {
    const quote = payload.new as Quote
    if (quote.symbol === 'QQQ') {
      // Update latest quote
      setLatestQuote(quote)
      
      setChartData(prev => {
        const newData = [...prev]
        const time = new Date(quote.timestamp)
        const key = time.toISOString()
        
        const existingIndex = newData.findIndex(d => d.timestamp === key)
        if (existingIndex >= 0) {
          newData[existingIndex].last_price = quote.last_price
          newData[existingIndex].volume = quote.volume
          newData[existingIndex].bid = quote.bid_price
          newData[existingIndex].ask = quote.ask_price
        } else {
          // Calculate relative time from now
          const now = new Date()
          const diffMs = now.getTime() - time.getTime()
          const diffMinutes = Math.floor(diffMs / 60000)
          const diffSeconds = Math.floor((diffMs % 60000) / 1000)
          
          let timeLabel: string
          if (diffMinutes > 0) {
            timeLabel = `${diffMinutes}m ${diffSeconds}s ago`
          } else {
            timeLabel = `${diffSeconds}s ago`
          }
          
          newData.push({
            timestamp: quote.timestamp,
            time: timeLabel,
            last_price: quote.last_price,
            sma9: null,
            session_vwap: null,
            volume: quote.volume,
            calls: [],
            puts: [],
            bid: quote.bid_price,
            ask: quote.ask_price
          })
        }
        
        return newData.slice(-100) // Keep last 100 points
      })
    }
  }

  const handleNewIndicator = (payload: any) => {
    const indicator = payload.new as Indicator
    if (indicator.symbol === 'QQQ') {
      setChartData(prev => {
        const newData = [...prev]
        const time = new Date(indicator.timestamp)
        const key = time.toISOString()
        
        const existingIndex = newData.findIndex(d => d.timestamp === key)
        if (existingIndex >= 0) {
          newData[existingIndex].sma9 = indicator.sma9
          newData[existingIndex].session_vwap = indicator.session_vwap
          newData[existingIndex].volume = indicator.volume
        }
        
        return newData
      })
    }
  }

  const handleNewOption = (payload: any) => {
    const option = payload.new as Option
    if (option.underlying_symbol === 'QQQ') {
      setChartData(prev => {
        const newData = [...prev]
        const time = new Date(option.timestamp)
        const key = time.toISOString()
        
        const existingIndex = newData.findIndex(d => d.timestamp === key)
        if (existingIndex >= 0) {
          if (option.option_type === 'CALL') {
            newData[existingIndex].calls.push(option)
          } else {
            newData[existingIndex].puts.push(option)
          }
        }
        
        return newData
      })
    }
  }

  return {
    chartData,
    currentTime,
    loading,
    latestQuote
  }
}
