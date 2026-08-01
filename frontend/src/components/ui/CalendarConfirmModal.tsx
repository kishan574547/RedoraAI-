import React, { useState } from 'react'
import { Calendar, Clock, CheckCircle2, X, AlertCircle } from 'lucide-react'

interface CalendarConfirmModalProps {
  isOpen: boolean
  taskTitle: string
  dueDate?: string
  onClose: () => void
  onConfirm: (startTime: string, durationMinutes: number) => void
}

export const CalendarConfirmModal: React.FC<CalendarConfirmModalProps> = ({
  isOpen,
  taskTitle,
  dueDate,
  onClose,
  onConfirm,
}) => {
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState(60)

  if (!isOpen) return null

  const displayDate = dueDate 
    ? new Date(dueDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Tomorrow (Default)'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans'>
      <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='flex items-start justify-between border-b border-slate-100 pb-3'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner'>
              <Calendar className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-base font-serif font-bold text-slate-900 leading-tight'>
                Schedule Google Calendar Event
              </h3>
              <p className='text-xs text-slate-500 mt-0.5'>Confirm time block & automated reminders</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className='p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Confirmation Question */}
        <div className='bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-2'>
          <div className='flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider'>
            <AlertCircle className='w-4 h-4 text-blue-600' />
            <span>User Confirmation Required</span>
          </div>
          <p className='text-xs text-slate-700 leading-relaxed'>
            Do you want to create a real time block in your Google Calendar for:
          </p>
          <div className='font-bold text-sm text-slate-900 bg-white p-2.5 rounded-xl border border-blue-200/80 shadow-2xs'>
            "{taskTitle}"
          </div>
        </div>

        {/* Time Slot & Duration Selector */}
        <div className='grid grid-cols-2 gap-3 text-xs'>
          <div>
            <label className='block font-semibold text-slate-600 mb-1 flex items-center gap-1'>
              <Clock className='w-3.5 h-3.5 text-slate-400' />
              <span>Start Time</span>
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className='w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            >
              <option value='08:00'>08:00 AM</option>
              <option value='09:00'>09:00 AM</option>
              <option value='10:00'>10:00 AM</option>
              <option value='11:00'>11:00 AM</option>
              <option value='13:00'>01:00 PM</option>
              <option value='14:00'>02:00 PM</option>
              <option value='15:00'>03:00 PM</option>
              <option value='16:00'>04:00 PM</option>
              <option value='18:00'>06:00 PM</option>
              <option value='20:00'>08:00 PM</option>
            </select>
          </div>

          <div>
            <label className='block font-semibold text-slate-600 mb-1 flex items-center gap-1'>
              <Calendar className='w-3.5 h-3.5 text-slate-400' />
              <span>Duration</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className='w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            >
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={90}>1.5 Hours</option>
              <option value={120}>2 Hours</option>
            </select>
          </div>
        </div>

        {/* Date Display */}
        <div className='text-xs text-slate-500 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60'>
          <span>Scheduled Target Date:</span>
          <span className='font-bold text-slate-800'>{displayDate}</span>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-3 pt-2 border-t border-slate-100'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors'
          >
            Decline / Cancel
          </button>

          <button
            type='button'
            onClick={() => onConfirm(startTime, duration)}
            className='flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5'
          >
            <CheckCircle2 className='w-4 h-4' />
            <span>Confirm & Schedule</span>
          </button>
        </div>
      </div>
    </div>
  )
}
