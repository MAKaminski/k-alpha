import { useState } from 'react'
import { Header } from '../src/components/Header'
import { Controls } from '../src/components/Controls'
import { PriceChart } from '../src/components/PriceChart'
import { VolumeChart } from '../src/components/VolumeChart'
import { useRealtimeData } from '../src/hooks/useRealtimeData'

export default function Home() {
  const { chartData, currentTime, loading, latestQuote, mounted } = useRealtimeData()
  
  const [showPrice, setShowPrice] = useState(true)
  const [showSMA9, setShowSMA9] = useState(true)
  const [showVWAP, setShowVWAP] = useState(true)
  const [showOptions, setShowOptions] = useState(true)

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
        <Header currentTime={currentTime} loading={loading} latestQuote={latestQuote} />
        
        <Controls
          showPrice={showPrice}
          showSMA9={showSMA9}
          showVWAP={showVWAP}
          showOptions={showOptions}
          onTogglePrice={() => setShowPrice(!showPrice)}
          onToggleSMA9={() => setShowSMA9(!showSMA9)}
          onToggleVWAP={() => setShowVWAP(!showVWAP)}
          onToggleOptions={() => setShowOptions(!showOptions)}
        />
        
        <div className="grid grid-cols-1 gap-6">
          <PriceChart
            data={chartData}
            showPrice={showPrice}
            showSMA9={showSMA9}
            showVWAP={showVWAP}
            showOptions={showOptions}
          />
          
          <VolumeChart data={chartData} />
        </div>
      </div>
    </div>
  )
}
