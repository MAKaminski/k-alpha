import React, { useState } from 'react'
import { Header } from './components/Header'
import { Controls } from './components/Controls'
import { PriceChart } from './components/PriceChart'
import { VolumeChart } from './components/VolumeChart'
import { useRealtimeData } from './hooks/useRealtimeData'

function App() {
  const { chartData, currentTime, loading } = useRealtimeData()
  
  const [showPrice, setShowPrice] = useState(true)
  const [showSMA9, setShowSMA9] = useState(true)
  const [showVWAP, setShowVWAP] = useState(true)
  const [showOptions, setShowOptions] = useState(true)

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Header currentTime={currentTime} loading={loading} />
        
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

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Loading market data...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
