import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Quote, Indicator, Option, ChartData } from '../types/data'

export function useDayData() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [currentDate, setCurrentDate] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)
  const [isLiveData, setIsLiveData] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch available dates when component mounts
  useEffect(() => {
    if (!mounted) return
    fetchAvailableDates()
  }, [mounted])

  // Fetch data when date changes
  useEffect(() => {
    if (currentDate && mounted) {
      fetchDataForDate(currentDate)
    }
  }, [currentDate, mounted])

  const fetchAvailableDates = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('timestamp')
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching available dates:', error)
        return
      }

      // Extract unique dates from timestamps
      const dates = new Set<string>()
      data?.forEach(quote => {
        const timestamp = new Date(quote.timestamp)
        if (!isNaN(timestamp.getTime())) {
          const date = timestamp.toISOString().split('T')[0]
          dates.add(date)
        }
      })

      const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a))
      setAvailableDates(sortedDates)

      // Set current date to the most recent date
      if (sortedDates.length > 0) {
        setCurrentDate(sortedDates[0])
      }
    } catch (error) {
      console.error('Error fetching available dates:', error)
    }
  }

  const fetchDataForDate = async (date: string) => {
    setLoading(true)
    try {
      // Create date range in EST/EDT timezone to ensure we get the correct calendar day
      const targetDate = new Date(date + 'T00:00:00') // Create date in local timezone
      
      // Convert to EST/EDT timezone for proper filtering
      const estDate = new Date(targetDate.toLocaleString("en-US", { timeZone: "America/New_York" }))
      const startOfDay = new Date(estDate.getFullYear(), estDate.getMonth(), estDate.getDate(), 0, 0, 0, 0)
      const endOfDay = new Date(estDate.getFullYear(), estDate.getMonth(), estDate.getDate(), 23, 59, 59, 999)
      
      // Convert back to UTC for database query
      const startOfDayUTC = startOfDay.toISOString()
      const endOfDayUTC = endOfDay.toISOString()

      console.log(`Fetching data for ${date} (EST): ${startOfDayUTC} to ${endOfDayUTC}`)

      // Fetch quotes for the specific date
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .gte('timestamp', startOfDayUTC)
        .lte('timestamp', endOfDayUTC)
        .order('timestamp', { ascending: true })

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError)
        return
      }

      // Fetch indicators for the specific date
      const { data: indicators, error: indicatorsError } = await supabase
        .from('indicators')
        .select('*')
        .gte('timestamp', startOfDayUTC)
        .lte('timestamp', endOfDayUTC)
        .order('timestamp', { ascending: true })

      if (indicatorsError) {
        console.error('Error fetching indicators:', indicatorsError)
        return
      }

      // Fetch options for the specific date
      const { data: options, error: optionsError } = await supabase
        .from('options')
        .select('*')
        .gte('timestamp', startOfDayUTC)
        .lte('timestamp', endOfDayUTC)
        .order('timestamp', { ascending: true })

      if (optionsError) {
        console.error('Error fetching options:', optionsError)
        return
      }

      // Fetch crossover signals for the specific date
      const { data: crossovers, error: crossoversError } = await supabase
        .from('crossover_signals')
        .select('*')
        .gte('timestamp', startOfDayUTC)
        .lte('timestamp', endOfDayUTC)
        .order('timestamp', { ascending: true })

      if (crossoversError) {
        console.error('Error fetching crossovers:', crossoversError)
        return
      }

      // Process data into chart format
      const processedData = processDataForChart(quotes || [], indicators || [], options || [], crossovers || [])
      setChartData(processedData)
      
      // Mark as live data if we have data
      if (processedData.length > 0) {
        setIsLiveData(true)
      }

    } catch (error) {
      console.error('Error fetching data for date:', error)
    } finally {
      setLoading(false)
    }
  }

  const processDataForChart = (quotes: any[], indicators: any[], options: any[], crossovers: any[]): ChartData[] => {
    // Create a map of timestamp to data point
    const dataMap = new Map<string, ChartData>()

    // Process quotes
    quotes.forEach(quote => {
      const timestamp = new Date(quote.timestamp)
      
      // Validate timestamp
      if (isNaN(timestamp.getTime())) {
        console.warn('Invalid timestamp found:', quote.timestamp)
        return
      }
      
      const timeKey = timestamp.toISOString()
      const timeLabel = timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'America/New_York'
      })

      dataMap.set(timeKey, {
        time: timeLabel,
        last_price: quote.last_price,
        bid: quote.bid_price,
        ask: quote.ask_price,
        volume: quote.volume,
        timestamp: quote.timestamp,
        sma9: null,
        session_vwap: null,
        calls: [],
        puts: []
      })
    })

    // Process indicators
    indicators.forEach(indicator => {
      const timestamp = new Date(indicator.timestamp)
      
      // Validate timestamp
      if (isNaN(timestamp.getTime())) {
        console.warn('Invalid indicator timestamp found:', indicator.timestamp)
        return
      }
      
      const timeKey = timestamp.toISOString()
      const existing = dataMap.get(timeKey)

      if (existing) {
        existing.sma9 = indicator.sma9
        existing.session_vwap = indicator.session_vwap
      }
    })

    // Process options
    options.forEach(option => {
      const timestamp = new Date(option.timestamp)
      
      // Validate timestamp
      if (isNaN(timestamp.getTime())) {
        console.warn('Invalid option timestamp found:', option.timestamp)
        return
      }
      
      const timeKey = timestamp.toISOString()
      const existing = dataMap.get(timeKey)

      if (existing) {
        const optionData = {
          id: option.id || 0,
          underlying_symbol: option.underlying_symbol,
          option_symbol: option.symbol,
          option_type: option.option_type,
          strike_price: option.strike_price,
          expiration_date: option.expiration_date,
          bid_price: option.bid_price,
          ask_price: option.ask_price,
          last_price: option.last_price,
          mark_price: option.mark_price,
          volume: option.volume,
          open_interest: option.open_interest,
          delta: option.delta,
          gamma: option.gamma,
          theta: option.theta,
          vega: option.vega,
          rho: option.rho,
          implied_volatility: option.implied_volatility,
          time_value: option.time_value,
          timestamp: option.timestamp,
          created_at: option.created_at || option.timestamp
        }

        if (option.option_type === 'CALL') {
          existing.calls.push(optionData)
        } else {
          existing.puts.push(optionData)
        }
      }
    })

    // Process crossovers and add to data points
    crossovers.forEach(crossover => {
      const timestamp = new Date(crossover.timestamp)
      
      if (isNaN(timestamp.getTime())) {
        console.warn('Invalid crossover timestamp found:', crossover.timestamp)
        return
      }
      
      const timeKey = timestamp.toISOString()
      const existingData = dataMap.get(timeKey)
      
      if (existingData) {
        // Add crossover to existing data point
        existingData.crossover = crossover
      } else {
        // Create new data point for crossover if no quote exists at this time
        const timeLabel = timestamp.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true,
          timeZone: 'America/New_York'
        })
        
        dataMap.set(timeKey, {
          time: timeLabel,
          timestamp: crossover.timestamp,
          last_price: crossover.last_price,
          sma9: crossover.sma9,
          session_vwap: crossover.session_vwap,
          volume: 0, // No volume data for crossover-only points
          calls: [],
          puts: [],
          bid: 0,
          ask: 0,
          crossover: crossover
        })
      }
    })

    // Convert map to array and sort by timestamp
    const sortedData = Array.from(dataMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      
      // Handle invalid dates
      if (isNaN(timeA) || isNaN(timeB)) {
        console.warn('Invalid date found during sorting:', { a: a.timestamp, b: b.timestamp })
        return 0
      }
      
      return timeA - timeB
    })
    
    return sortedData
  }

  const refetchDataForDate = async (date: string) => {
    setRefetching(true)
    try {
      await fetchDataForDate(date)
    } finally {
      setRefetching(false)
    }
  }

  const changeDate = (date: string) => {
    setCurrentDate(date)
  }

  return {
    chartData,
    currentDate,
    availableDates,
    loading: loading || refetching,
    refetching,
    isLiveData,
    changeDate,
    refetchDataForDate,
    mounted
  }
}
