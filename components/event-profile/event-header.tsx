'use client'
import { format } from 'date-fns'
import { Edit, Trash2, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui'
import type { EventInfo } from '@/types/event-profile'

interface EventHeaderProps {
  event: EventInfo
  onEdit: () => void
  onDelete: () => void
}

export function EventHeader({ event, onEdit, onDelete }: Readonly<EventHeaderProps>) {
  // Create gradient background using theme colors
  const gradientStyle = event.themeColor && event.themeAccent 
    ? { background: `linear-gradient(135deg, ${event.themeColor} 0%, ${event.themeAccent} 100%)` }
    : { background: 'linear-gradient(135deg, #1F4D3A 0%, #2D5A42 100%)' }

  return (
    <div className="relative overflow-hidden rounded-2xl" style={gradientStyle}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      </div>

      <div className="relative p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-heading font-bold text-white">{event.name}</h1>
              {event.isMain && (
                <span className="px-2 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                  Main Event
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-white/90">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span className="text-lg font-medium">
                  {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              
              {(event.startTime || event.endTime) && (
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span className="text-sm">
                    {event.startTime && event.endTime 
                      ? `${event.startTime} - ${event.endTime}`
                      : event.startTime || event.endTime}
                  </span>
                </div>
              )}
              
              {event.venue && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="text-sm">{event.venue}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="mt-4 text-white/80 text-sm max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex gap-2 ml-6">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={onEdit}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Edit size={14} />
              Edit
            </Button>
            <Button 
              variant="danger" 
              size="sm"
              onClick={onDelete}
              className="bg-red-500/20 hover:bg-red-500/30 text-white border-red-300/30"
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </div>

        {/* Event Type Badge */}
        <div className="mt-6">
          <span className="inline-flex items-center px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
            {event.type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      </div>
    </div>
  )
}