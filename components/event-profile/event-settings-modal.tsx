'use client'
import { useState } from 'react'
import { Modal, Button, Input, Label, Textarea, Select } from '@/components/ui'
import { Save, X } from 'lucide-react'
import type { EventInfo } from '@/types/event-profile'

interface EventSettingsModalProps {
  event: EventInfo
  onClose: () => void
  onSave: (updatedEvent: Partial<EventInfo>) => Promise<void>
}

const EVENT_TYPES = [
  'WEDDING', 'RECEPTION', 'RURACIO', 'TRADITIONAL', 'CIVIL', 'POST_WEDDING'
]

export function EventSettingsModal({ event, onClose, onSave }: Readonly<EventSettingsModalProps>) {
  const [formData, setFormData] = useState({
    name: event.name,
    type: event.type,
    date: event.date.split('T')[0], // Extract date part
    venue: event.venue || '',
    description: event.description || '',
    startTime: event.startTime || '',
    endTime: event.endTime || ''
  })
  
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await onSave({
        name: formData.name,
        type: formData.type,
        date: new Date(formData.date).toISOString(),
        venue: formData.venue || null,
        description: formData.description || null,
        startTime: formData.startTime || null,
        endTime: formData.endTime || null
      })
      onClose()
    } catch (error) {
      console.error('Failed to save event:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Event Settings">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-heading font-semibold text-[#14161C]">
            Event Information
          </h4>
          
          <div>
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              placeholder="Enter venue name and address"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add event description or special notes"
              rows={3}
            />
          </div>
        </div>

        {/* Theme Colors Note */}
        <div className="p-4 bg-[#F7F5F2] rounded-xl border border-[#1F4D3A]/10">
          <p className="text-sm text-[#14161C]/60">
            <strong>Theme Colors:</strong> Event colors are managed through your wedding palette in Settings. 
            The first two colors from your palette are used as the event theme.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            <X size={14} />
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}