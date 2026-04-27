'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Calendar, Clock, MapPin } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'

// Event types with their display names and colors
const EVENT_TYPES = [
  { value: 'WEDDING', label: 'Wedding Ceremony', color: 'bg-[#1F4D3A]/10 text-[#1F4D3A]' },
  { value: 'TRADITIONAL', label: 'Traditional Ceremony', color: 'bg-[#D4A94F]/10 text-[#D4A94F]' },
  { value: 'RECEPTION', label: 'Reception', color: 'bg-[#1F4D3A]/10 text-[#1F4D3A]' },
  { value: 'ENGAGEMENT', label: 'Engagement Party', color: 'bg-[#D4A94F]/10 text-[#D4A94F]' },
  { value: 'CIVIL', label: 'Civil Ceremony', color: 'bg-[#1F4D3A]/10 text-[#1F4D3A]' },
  { value: 'POST_WEDDING', label: 'Post-Wedding Event', color: 'bg-[#D4A94F]/10 text-[#D4A94F]' },
]

interface Props {
  weddingId: string
  eventId: string
  initialValues: {
    name: string
    type: string
    date: string
    startTime: string
    endTime: string
    venue: string
    description: string
    isMain: boolean
  }
}

export function ManageEventClient({ weddingId, eventId, initialValues }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState(initialValues.name)
  const [type, setType] = useState(initialValues.type)
  const [date, setDate] = useState(initialValues.date)
  const [startTime, setStartTime] = useState(initialValues.startTime)
  const [endTime, setEndTime] = useState(initialValues.endTime)
  const [venue, setVenue] = useState(initialValues.venue)
  const [description, setDescription] = useState(initialValues.description)
  const [isMain, setIsMain] = useState(initialValues.isMain)
  
  const [saving, setSaving] = useState(false)

  const selectedEventType = EVENT_TYPES.find(t => t.value === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/weddings/${weddingId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          venue: venue.trim() || null,
          description: description.trim() || null,
          isMain,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      toast('Event updated successfully', 'success')
      router.push(`/dashboard/${weddingId}/events/${eventId}/profile`)
      router.refresh()
    } catch (error) {
      console.error('Error updating event:', error)
      toast('Failed to update event', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-[#F7F5F2]">
      {/* Header */}
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Event Management</p>
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Manage Event</h1>
          <p className="text-[#14161C]/60 mt-2">Update event details, timing, and venue information</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* Basic Information */}
          <div>
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-6">Basic Information</p>
            <div className="space-y-6">
              <div>
                <label htmlFor="event-name" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                  Event Name
                </label>
                <Input
                  id="event-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Wedding Ceremony"
                  required
                />
              </div>

              <div>
                <label htmlFor="event-type" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                  Event Type
                </label>
                <select
                  id="event-type"
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent text-sm"
                  required
                >
                  {EVENT_TYPES.map(eventType => (
                    <option key={eventType.value} value={eventType.value}>
                      {eventType.label}
                    </option>
                  ))}
                </select>
                {selectedEventType && (
                  <div className="mt-2">
                    <Badge className={selectedEventType.color}>
                      {selectedEventType.label}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="event-description" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="event-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the event..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is-main"
                  checked={isMain}
                  onChange={e => setIsMain(e.target.checked)}
                  className="w-4 h-4 text-[#1F4D3A] border-[#1F4D3A]/20 rounded focus:ring-[#1F4D3A]/40"
                />
                <label htmlFor="is-main" className="text-sm font-medium text-[#14161C]">
                  Mark as main event
                </label>
              </div>
            </div>
          </div>

          <hr className="border-[#1F4D3A]/8" />

          {/* Date & Time */}
          <div>
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-6">Date & Time</p>
            <div className="space-y-6">
              <div>
                <label htmlFor="event-date" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                  Event Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
                  <input
                    type="date"
                    id="event-date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent text-sm"
                    required
                  />
                </div>
                {date && (
                  <p className="text-xs text-[#14161C]/40 mt-1">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-time" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                    Start Time (Optional)
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
                    <input
                      type="time"
                      id="start-time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="end-time" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                    End Time (Optional)
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
                    <input
                      type="time"
                      id="end-time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#1F4D3A]/8" />

          {/* Location */}
          <div>
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-6">Location</p>
            <div>
              <label htmlFor="event-venue" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-2">
                Venue (Optional)
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14161C]/40" />
                <Input
                  id="event-venue"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="e.g. Safari Park Hotel, Nairobi"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}