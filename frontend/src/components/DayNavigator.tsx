import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react'

interface DayNavigatorProps {
  currentDate: string
  onDateChange: (date: string) => void
  onRefetchData: (date: string) => void
  availableDates: string[]
  loading: boolean
}

export function DayNavigator({ 
  currentDate, 
  onDateChange, 
  onRefetchData, 
  availableDates, 
  loading 
}: DayNavigatorProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate)

  useEffect(() => {
    setSelectedDate(currentDate)
  }, [currentDate])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const getPreviousDate = () => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() - 1)
    return current.toISOString().split('T')[0]
  }

  const getNextDate = () => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + 1)
    return current.toISOString().split('T')[0]
  }

  const handlePreviousDay = () => {
    const prevDate = getPreviousDate()
    if (availableDates.includes(prevDate)) {
      setSelectedDate(prevDate)
      onDateChange(prevDate)
    }
  }

  const handleNextDay = () => {
    const nextDate = getNextDate()
    if (availableDates.includes(nextDate)) {
      setSelectedDate(nextDate)
      onDateChange(nextDate)
    }
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    onDateChange(date)
  }

  const handleRefetch = () => {
    onRefetchData(selectedDate)
  }

  const canGoPrevious = availableDates.includes(getPreviousDate())
  const canGoNext = availableDates.includes(getNextDate())

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar size={20} />
          Day Navigation
        </h3>
        <button
          onClick={handleRefetch}
          disabled={loading}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
            ${loading 
              ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed' 
              : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }
          `}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="font-medium">Refetch Data</span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        {/* Previous Day Button */}
        <button
          onClick={handlePreviousDay}
          disabled={!canGoPrevious || loading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
            ${!canGoPrevious || loading
              ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }
          `}
        >
          <ChevronLeft size={16} />
          <span className="font-medium">Previous</span>
        </button>

        {/* Current Date Display */}
        <div className="flex flex-col items-center">
          <div className="text-lg font-semibold text-gray-800">
            {formatDate(selectedDate)}
          </div>
          <div className="text-sm text-gray-500">
            {selectedDate}
          </div>
        </div>

        {/* Next Day Button */}
        <button
          onClick={handleNextDay}
          disabled={!canGoNext || loading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
            ${!canGoNext || loading
              ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }
          `}
        >
          <span className="font-medium">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Available Dates List */}
      <div className="mt-4">
        <div className="text-sm text-gray-600 mb-2">Available Dates:</div>
        <div className="flex flex-wrap gap-2">
          {availableDates.map(date => (
            <button
              key={date}
              onClick={() => handleDateSelect(date)}
              disabled={loading}
              className={`
                px-3 py-1 rounded-md text-sm font-medium transition-all
                ${selectedDate === date
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${loading ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {formatDate(date)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
