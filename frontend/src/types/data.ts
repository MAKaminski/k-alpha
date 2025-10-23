export interface Quote {
  id: number
  symbol: string
  bid_price: number | string // Database returns string, we convert to number
  ask_price: number | string // Database returns string, we convert to number
  last_price: number | string // Database returns string, we convert to number
  volume: number
  timestamp: string
  created_at: string
  bid?: number
  ask?: number
}

export interface Indicator {
  id: number
  symbol: string
  timestamp: string
  last_price: number | string // Database returns string, we convert to number
  volume: number
  sma9: number | string | null // Database returns string, we convert to number
  session_vwap: number | string | null // Database returns string, we convert to number
  session_date: string
  is_market_hours: boolean
  session_start_time: string | null
  session_volume: number
  session_pv_sum: number
  created_at: string
}

export interface Option {
  id: number
  underlying_symbol: string
  option_symbol: string
  option_type: 'CALL' | 'PUT'
  strike_price: number
  expiration_date: string
  bid_price: number | null
  ask_price: number | null
  last_price: number | null
  mark_price: number | null
  volume: number | null
  open_interest: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  rho: number | null
  implied_volatility: number | null
  time_value: number | null
  timestamp: string
  created_at: string
}

export interface ChartData {
  timestamp: string
  time: string
  last_price: number
  sma9: number | null
  session_vwap: number | null
  volume: number
  calls: Option[]
  puts: Option[]
  bid: number
  ask: number
  is_market_hours?: boolean
}
