import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Quote, Indicator, Option, ChartData } from '../types/data'
// import { format } from 'date-fns'

export function useRealtimeData() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [latestQuote, setLatestQuote] = useState<Quote | null>(null)
  const [mounted, setMounted] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update current time every second (but don't update chart time labels)
  useEffect(() => {
    if (!mounted) return
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [mounted])

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
      
      // Fetch data for the entire trading day (9AM-4PM EST)
      const today = new Date()
      const marketOpen = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0) // 9AM EST
      const marketClose = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0, 0) // 4PM EST
      
      const [quotesResult, indicatorsResult, optionsResult] = await Promise.all([
        supabase
          .from('quotes')
          .select('*')
          .eq('symbol', 'QQQ')
          .gte('timestamp', marketOpen.toISOString())
          .lte('timestamp', marketClose.toISOString())
          .order('timestamp', { ascending: true }),
        
        supabase
          .from('indicators')
          .select('*')
          .eq('symbol', 'QQQ')
          .gte('timestamp', marketOpen.toISOString())
          .lte('timestamp', marketClose.toISOString())
          .order('timestamp', { ascending: true }),
        
        supabase
          .from('options')
          .select('*')
          .eq('underlying_symbol', 'QQQ')
          .gte('timestamp', marketOpen.toISOString())
          .lte('timestamp', marketClose.toISOString())
          .order('timestamp', { ascending: true })
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
        console.log('Initial quote loaded:', quotes[0])
        console.log('Initial bid price:', quotes[0].bid_price, 'Initial ask price:', quotes[0].ask_price)
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
    
    // Calculate trading day boundaries (8am-5pm EST with 1hr buffer)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const marketOpen = new Date(today.getTime() + 8 * 60 * 60 * 1000) // 8am EST
    const marketEnd = new Date(today.getTime() + 17 * 60 * 60 * 1000) // 5pm EST

    // Sort quotes by timestamp to calculate interval volume
    const sortedQuotes = [...quotes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Process quotes and calculate interval volume
    sortedQuotes.forEach((quote, index) => {
      const time = new Date(quote.timestamp)
      
      // Only include data within trading day (8am-5pm EST)
      if (time < marketOpen || time > marketEnd) {
        return
      }
      
      const key = time.toISOString()
      
      // Calculate interval volume (volume traded since last tick)
      let intervalVolume = 0
      if (index > 0) {
        const prevQuote = sortedQuotes[index - 1]
        intervalVolume = Math.max(0, quote.volume - prevQuote.volume)
        console.log(`Volume calc: Current=${quote.volume}, Prev=${prevQuote.volume}, Interval=${intervalVolume}`)
      } else {
        // For the first quote, use the total volume as interval volume
        intervalVolume = quote.volume
        console.log(`First quote volume: ${intervalVolume}`)
      }
      
      // Format time as trading hours (9am-4pm EST) with actual time progression
      const estTime = new Date(time.getTime() - (time.getTimezoneOffset() * 60000) + (5 * 60 * 60 * 1000)) // Convert to EST
      const hours = estTime.getHours()
      const minutes = estTime.getMinutes()
      const seconds = estTime.getSeconds()
      
      let timeLabel: string
      if (hours >= 9 && hours < 16) {
        // During trading hours, show actual time with minute precision
        timeLabel = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      } else {
        // Outside trading hours, show relative time
        const diffMs = now.getTime() - time.getTime()
        const diffMinutes = Math.floor(diffMs / 60000)
        const diffSeconds = Math.floor((diffMs % 60000) / 1000)
        
        if (diffMinutes > 0) {
          timeLabel = `${diffMinutes}m ${diffSeconds}s ago`
        } else {
          timeLabel = `${diffSeconds}s ago`
        }
      }
      
      dataMap.set(key, {
        timestamp: quote.timestamp,
        time: timeLabel,
        last_price: quote.last_price,
        sma9: null,
        session_vwap: null,
        volume: intervalVolume, // Use interval volume instead of cumulative
        calls: [],
        puts: [],
        bid: quote.bid_price,
        ask: quote.ask_price
      })
    })

    // Process indicators
    indicators.forEach(indicator => {
      const time = new Date(indicator.timestamp)
      
      // Only include data within trading day (8am-5pm EST)
      if (time < marketOpen || time > marketEnd) {
        return
      }
      
      const key = time.toISOString()
      
      const existing = dataMap.get(key)
      if (existing) {
        existing.sma9 = indicator.sma9
        existing.session_vwap = indicator.session_vwap
        existing.volume = indicator.volume
        console.log('Indicator matched:', key, 'VWAP:', indicator.session_vwap)
      } else {
        console.log('Indicator not matched:', key, 'VWAP:', indicator.session_vwap)
      }
    })

    // Process options
    console.log('Processing options:', options.length, 'options found')
    options.forEach(option => {
      const time = new Date(option.timestamp)
      
      // Only include data within trading day (8am-5pm EST)
      if (time < marketOpen || time > marketEnd) {
        return
      }
      
      const key = time.toISOString()
      
      const existing = dataMap.get(key)
      if (existing) {
        if (option.option_type === 'CALL') {
          existing.calls.push(option)
        } else {
          existing.puts.push(option)
        }
        console.log(`Added ${option.option_type} option for ${key}:`, option.strike_price, option.bid_price, option.ask_price)
      } else {
        console.log(`No matching quote for option at ${key}`)
      }
    })

    // Convert to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      // Don't limit to 100 points - show full trading day
  }

  const handleNewQuote = (payload: any) => {
    const quote = payload.new as Quote
    if (quote.symbol === 'QQQ') {
      // Update latest quote
      console.log('New quote received:', quote)
      console.log('Bid price:', quote.bid_price, 'Ask price:', quote.ask_price)
      setLatestQuote(quote)
      
      setChartData(prev => {
        const newData = [...prev]
        const time = new Date(quote.timestamp)
        const key = time.toISOString()
        
        const existingIndex = newData.findIndex(d => d.timestamp === key)
        if (existingIndex >= 0) {
          newData[existingIndex].last_price = quote.last_price
          // Calculate interval volume for existing data point
          if (existingIndex > 0) {
            const prevQuote = newData[existingIndex - 1]
            const intervalVolume = Math.max(0, quote.volume - (prevQuote.volume + (prevQuote.volume || 0)))
            newData[existingIndex].volume = intervalVolume
          }
          newData[existingIndex].bid = quote.bid_price
          newData[existingIndex].ask = quote.ask_price
        } else {
          // Format time as trading hours (9am-4pm EST) with actual time progression
          const estTime = new Date(time.getTime() - (time.getTimezoneOffset() * 60000) + (5 * 60 * 60 * 1000)) // Convert to EST
          const hours = estTime.getHours()
          const minutes = estTime.getMinutes()
          const seconds = estTime.getSeconds()
          
          let timeLabel: string
          if (hours >= 9 && hours < 16) {
            // During trading hours, show actual time with minute precision
            timeLabel = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          } else {
            // Outside trading hours, show relative time
            const now = new Date()
            const diffMs = now.getTime() - time.getTime()
            const diffMinutes = Math.floor(diffMs / 60000)
            const diffSeconds = Math.floor((diffMs % 60000) / 1000)
            
            if (diffMinutes > 0) {
              timeLabel = `${diffMinutes}m ${diffSeconds}s ago`
            } else {
              timeLabel = `${diffSeconds}s ago`
            }
          }
          
          // Calculate interval volume for new data point
          let intervalVolume = 0
          if (newData.length > 0) {
            const lastData = newData[newData.length - 1]
            // Get the cumulative volume from the last data point
            const lastCumulativeVolume = lastData.volume + (lastData.volume || 0) // This is a rough estimate
            intervalVolume = Math.max(0, quote.volume - lastCumulativeVolume)
          } else {
            intervalVolume = quote.volume
          }
          
          newData.push({
            timestamp: quote.timestamp,
            time: timeLabel,
            last_price: quote.last_price,
            sma9: null,
            session_vwap: null,
            volume: intervalVolume, // Use interval volume
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
    latestQuote,
    mounted
  }
}
