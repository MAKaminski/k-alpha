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
      
      // Fetch data for today's trading session only (market hours)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Set market hours in EST (9AM-4PM)
      const marketOpen = new Date(today.getTime() + 9 * 60 * 60 * 1000) // 9AM EST
      const marketClose = new Date(today.getTime() + 16 * 60 * 60 * 1000) // 4PM EST
      
      console.log('Current time:', now.toISOString())
      console.log('Fetching market hours data for today:', today.toISOString().split('T')[0])
      console.log('Market open time:', marketOpen.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      console.log('Market close time:', marketClose.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      
      // First check if there's any data at all
      const allDataResult = await supabase
        .from('indicators')
        .select('*')
        .eq('symbol', 'QQQ')
        .order('timestamp', { ascending: false })
        .limit(10)

      console.log('All indicators data (last 10):', {
        error: allDataResult.error,
        count: allDataResult.data?.length || 0,
        sample: allDataResult.data?.[0]
      })

      const [indicatorsResult] = await Promise.all([
        supabase
          .from('indicators')
          .select('*')
          .eq('symbol', 'QQQ')
          .eq('is_market_hours', true)
          .gte('timestamp', marketOpen.toISOString())
          .lte('timestamp', marketClose.toISOString())
          .order('timestamp', { ascending: true })
      ])

      console.log('Supabase query result:', {
        error: indicatorsResult.error,
        data: indicatorsResult.data,
        count: indicatorsResult.data?.length || 0
      })

      if (indicatorsResult.error) throw indicatorsResult.error

      const indicators = indicatorsResult.data as Indicator[]
      const quotes: Quote[] = [] // No quotes table available
      const options: Option[] = [] // No options table available

      console.log('Fetched data:', {
        quotes: quotes.length,
        indicators: indicators.length,
        options: options.length,
        firstQuote: quotes[0]?.timestamp,
        lastQuote: quotes[quotes.length - 1]?.timestamp,
        firstIndicator: indicators[0]?.timestamp,
        lastIndicator: indicators[indicators.length - 1]?.timestamp,
        firstQuoteTime: quotes[0] ? new Date(quotes[0].timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A',
        lastQuoteTime: quotes[quotes.length - 1] ? new Date(quotes[quotes.length - 1].timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A',
        sampleIndicator: indicators[0] ? {
          symbol: indicators[0].symbol,
          last_price: indicators[0].last_price,
          sma9: indicators[0].sma9,
          session_vwap: indicators[0].session_vwap,
          is_market_hours: indicators[0].is_market_hours,
          timestamp: indicators[0].timestamp
        } : 'No indicators'
      })

      // Combine and process data
      const combinedData = combineData(quotes, indicators, options)
      console.log('Combined data points:', combinedData.length)
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
    // Since we only have indicators data, create chart data from indicators
    console.log(`Processing ${indicators.length} indicators for chart data`)
    
    const result: ChartData[] = []
    
    indicators.forEach((indicator, index) => {
      const time = new Date(indicator.timestamp)
      
      // Format time as HH:MM:SS in EST for consistent display
      const estTime = time.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      
      const timeLabel = estTime
      
      // Use the actual price data from the database
      const price = indicator.last_price
      
      result.push({
        timestamp: indicator.timestamp,
        time: timeLabel,
        last_price: price,
        sma9: indicator.sma9, // Can be null
        session_vwap: indicator.session_vwap, // Can be null
        volume: indicator.volume,
        calls: [],
        puts: [],
        bid: price - 0.01,
        ask: price + 0.01
      })
    })
    
    console.log('Created chart data from indicators:', result.length, 'points')
    console.log('Sample chart data:', result.slice(0, 3))
    
    // Debug: Check for any issues with the data
    const hasValidPrices = result.every(d => d.last_price && d.last_price > 0)
    const hasValidTimes = result.every(d => d.time && d.time.length > 0)
    const sma9Count = result.filter(d => d.sma9 !== null).length
    const vwapCount = result.filter(d => d.session_vwap !== null).length
    console.log('Data validation:', { 
      hasValidPrices, 
      hasValidTimes, 
      totalPoints: result.length,
      sma9Available: sma9Count,
      vwapAvailable: vwapCount
    })
    
    if (!hasValidPrices) {
      console.log('❌ Invalid prices detected!')
      console.log('Sample invalid prices:', result.filter(d => !d.last_price || d.last_price <= 0).slice(0, 3))
    }
    
    return result
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
          newData[existingIndex].last_price = indicator.last_price
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
