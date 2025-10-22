import React from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface ControlsProps {
  showPrice: boolean
  showSMA9: boolean
  showVWAP: boolean
  showOptions: boolean
  onTogglePrice: () => void
  onToggleSMA9: () => void
  onToggleVWAP: () => void
  onToggleOptions: () => void
}

export function Controls({
  showPrice,
  showSMA9,
  showVWAP,
  showOptions,
  onTogglePrice,
  onToggleSMA9,
  onToggleVWAP,
  onToggleOptions
}: ControlsProps) {
  const controls = [
    { key: 'price', label: 'QQQ Price', show: showPrice, onToggle: onTogglePrice, color: '#2563eb' },
    { key: 'sma9', label: 'SMA9', show: showSMA9, onToggle: onToggleSMA9, color: '#dc2626' },
    { key: 'vwap', label: 'Session VWAP', show: showVWAP, onToggle: onToggleVWAP, color: '#16a34a' },
    { key: 'options', label: 'Options', show: showOptions, onToggle: onToggleOptions, color: '#f59e0b' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-4">Chart Controls</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {controls.map(control => (
          <button
            key={control.key}
            onClick={control.onToggle}
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
              ${control.show 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
              }
            `}
          >
            {control.show ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="font-medium">{control.label}</span>
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: control.color }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
