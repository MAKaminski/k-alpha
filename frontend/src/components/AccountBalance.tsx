import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AccountBalance } from '../types/data'
import { DollarSign, TrendingUp, CreditCard, Zap } from 'lucide-react'

interface AccountBalanceProps {
  accountId: string
}

export function AccountBalanceWidget({ accountId }: AccountBalanceProps) {
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAccountBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('account_balances')
        .select('*')
        .eq('account_id', accountId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Error fetching account balance:', error)
        return
      }

      setAccountBalance(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching account balance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch initial data
  useEffect(() => {
    fetchAccountBalance()
  }, [accountId])

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAccountBalance, 5000)
    return () => clearInterval(interval)
  }, [accountId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading account balance...</span>
        </div>
      </div>
    )
  }

  if (!accountBalance) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="text-center text-gray-500">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No account balance data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6" data-testid="account-balance-widget">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-600" />
          Account Balance
        </h3>
        <div className="text-sm text-gray-500">
          {lastUpdated && `Updated: ${formatTime(lastUpdated.toISOString())}`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Account ID */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CreditCard className="h-4 w-4 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-600">Account ID</span>
          </div>
          <p className="text-lg font-semibold text-gray-800" data-testid="account-id">{accountBalance.account_id}</p>
          <p className="text-xs text-gray-500">{accountBalance.account_type}</p>
        </div>

        {/* Current Balance */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-700">Total Balance</span>
          </div>
          <p className="text-2xl font-bold text-green-800" data-testid="current-balance">
            {formatCurrency(accountBalance.current_balance)}
          </p>
        </div>

        {/* Available Cash */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-700">Available Cash</span>
          </div>
          <p className="text-xl font-semibold text-blue-800" data-testid="available-cash">
            {formatCurrency(accountBalance.available_cash)}
          </p>
        </div>

        {/* Buying Power */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Zap className="h-4 w-4 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-700">Buying Power</span>
          </div>
          <p className="text-xl font-semibold text-purple-800" data-testid="buying-power">
            {formatCurrency(accountBalance.buying_power)}
          </p>
        </div>
      </div>

      {/* Account Number (smaller, at bottom) */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Account Number: {accountBalance.account_number}</span>
          <span data-testid="last-updated">Last Data: {formatTime(accountBalance.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}
