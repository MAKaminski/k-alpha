import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '../src/components/Header'
import { AccountBalanceWidget } from '../src/components/AccountBalance'
import { CrossoverWidget } from '../src/components/CrossoverWidget'
import { Controls } from '../src/components/Controls'
import { PriceChart } from '../src/components/PriceChart'
import { VolumeChart } from '../src/components/VolumeChart'
import { DayNavigator } from '../src/components/DayNavigator'
import { useDayData } from '../src/hooks/useDayData'
import { filterMarketHoursData } from '../src/utils/marketHours'
import { Clock, BarChart3 } from 'lucide-react'

export default function History() {
  const { 
    chartData, 
    currentDate, 
    availableDates, 
    loading, 
    refetching,
    isLiveData,
    changeDate, 
    refetchDataForDate, 
    mounted 
  } = useDayData()
  
  const [showPrice, setShowPrice] = useState(true)
  const [showSMA9, setShowSMA9] = useState(true)
  const [showVWAP, setShowVWAP] = useState(true)
  const [showOptions, setShowOptions] = useState(true)
  const [showMarketHours, setShowMarketHours] = useState(true)

  // Filter data based on market hours setting
  const filteredChartData = useMemo(() => {
    if (showMarketHours) {
      return filterMarketHoursData(chartData)
    }
    return chartData
  }, [chartData, showMarketHours])

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Current time for header
  const currentTime = new Date()
  
  const latestQuote = chartData.length > 0 ? {
    id: 0,
    symbol: 'QQQ',
    bid_price: chartData[chartData.length - 1].bid || 0,
    ask_price: chartData[chartData.length - 1].ask || 0,
    last_price: chartData[chartData.length - 1].last_price || 0,
    volume: chartData[chartData.length - 1].volume || 0,
    timestamp: chartData[chartData.length - 1].timestamp,
    created_at: chartData[chartData.length - 1].timestamp
  } : null

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Header currentTime={currentTime} loading={loading} isLiveData={isLiveData} latestQuote={latestQuote} />
        
        {/* Account Balance Widget */}
        <AccountBalanceWidget accountId="8042-3452" />
        
        {/* Crossover Widget */}
        <CrossoverWidget symbol="QQQ" sessionDate={currentDate} />
        
        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 size={20} />
              Historical Data
            </h2>
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Clock size={16} />
              <span>Back to Real-time</span>
            </Link>
          </div>
        </div>
        
        <DayNavigator
          currentDate={currentDate}
          onDateChange={changeDate}
          onRefetchData={refetchDataForDate}
          availableDates={availableDates}
          loading={refetching}
        />
        
        <Controls
          showPrice={showPrice}
          showSMA9={showSMA9}
          showVWAP={showVWAP}
          showOptions={showOptions}
          showMarketHours={showMarketHours}
          onTogglePrice={() => setShowPrice(!showPrice)}
          onToggleSMA9={() => setShowSMA9(!showSMA9)}
          onToggleVWAP={() => setShowVWAP(!showVWAP)}
          onToggleOptions={() => setShowOptions(!showOptions)}
          onToggleMarketHours={() => setShowMarketHours(!showMarketHours)}
        />

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading data for {currentDate}...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-gray-600">No data available for {currentDate}</p>
              <p className="text-sm text-gray-500 mt-2">
                Try selecting a different date or refetch the data
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <PriceChart
              data={filteredChartData}
              showPrice={showPrice}
              showSMA9={showSMA9}
              showVWAP={showVWAP}
              showOptions={showOptions}
            />
            
            <VolumeChart data={filteredChartData} />
          </div>
        )}
      </div>
    </div>
  )
}
