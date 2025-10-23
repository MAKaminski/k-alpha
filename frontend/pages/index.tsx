import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '../src/components/Header'
import { AccountBalanceWidget } from '../src/components/AccountBalance'
import { CrossoverWidget } from '../src/components/CrossoverWidget'
import { Controls } from '../src/components/Controls'
import { PriceChart } from '../src/components/PriceChart'
import { VolumeChart } from '../src/components/VolumeChart'
import { OptionsChart } from '../src/components/OptionsChart'
import { useRealtimeData } from '../src/hooks/useRealtimeData'
import { filterMarketHoursData } from '../src/utils/marketHours'
import { History, BarChart3 } from 'lucide-react'

export default function Home() {
  const { chartData, currentTime, loading, isLiveData, latestQuote, mounted } = useRealtimeData()
  
  const [showPrice, setShowPrice] = useState(true)
  const [showSMA9, setShowSMA9] = useState(true)
  const [showVWAP, setShowVWAP] = useState(true)
  const [showOptions, setShowOptions] = useState(true)
  const [showMarketHours, setShowMarketHours] = useState(true)
  const [isTestMode, setIsTestMode] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Header currentTime={currentTime} loading={loading} isLiveData={isLiveData} latestQuote={latestQuote} />
        
        {/* Account Balance Widget */}
        <AccountBalanceWidget accountId={isTestMode ? "TEST-ACCOUNT-001" : "8042-3452"} />
        
        {/* Crossover Widget */}
        <CrossoverWidget symbol="QQQ" sessionDate={new Date().toISOString().split('T')[0]} />
        
        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Real-time Data</h2>
            <Link 
              href="/history"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <History size={16} />
              <span>View Historical Data</span>
            </Link>
          </div>
        </div>
        
        <Controls
          showPrice={showPrice}
          showSMA9={showSMA9}
          showVWAP={showVWAP}
          showOptions={showOptions}
          showMarketHours={showMarketHours}
          isTestMode={isTestMode}
          onTogglePrice={() => setShowPrice(!showPrice)}
          onToggleSMA9={() => setShowSMA9(!showSMA9)}
          onToggleVWAP={() => setShowVWAP(!showVWAP)}
          onToggleOptions={() => setShowOptions(!showOptions)}
          onToggleMarketHours={() => setShowMarketHours(!showMarketHours)}
          onToggleTestMode={() => setIsTestMode(!isTestMode)}
        />
        

        <div className="grid grid-cols-1 gap-6">
          <PriceChart
            data={filteredChartData}
            showPrice={showPrice}
            showSMA9={showSMA9}
            showVWAP={showVWAP}
            showOptions={showOptions}
          />
          
          <VolumeChart data={filteredChartData} />
          
          {showOptions && (
            <OptionsChart currentPrice={typeof latestQuote?.last_price === 'number' ? latestQuote.last_price : 0} />
          )}
        </div>
      </div>
    </div>
  )
}
