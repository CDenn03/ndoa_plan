'use client'
import { useState } from 'react'
import { Zap, Phone, AlertTriangle, CheckCircle2, Circle, Plus } from 'lucide-react'
import { Button, Badge, EmptyState, Modal, Input, Label, Select } from '@/components/ui'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface TimelineEvent {
  id: string; title: string; startTime: string; endTime?: string | null
  location?: string | null; isComplete: boolean; color?: string | null; assignedRoleName?: string | null
}

interface Vendor {
  id: string; name: string; category: string; contactPhone?: string | null; contactEmail?: string | null
}

interface Incident {
  id: string; description: string; severity: string; reportedAt: string; resolvedAt?: string | null; resolution?: string | null
}

interface Props {
  weddingId: string
  events: TimelineEvent[]
  vendors: Vendor[]
  incidents: Incident[]
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-4 border-red-400 bg-red-50/50',
  HIGH: 'border-l-4 border-amber-400 bg-amber-50/50',
  MEDIUM: 'border-l-4 border-sky-400 bg-sky-50/50',
  LOW: 'border-l-4 border-zinc-300',
}

function LogIncidentModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ description: '', severity: 'MEDIUM' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Incident logged', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to log incident', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Log incident">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="inc-desc">Description *</Label>
          <Input id="inc-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What happened?" required />
        </div>
        <div>
          <Label htmlFor="inc-sev">Severity</Label>
          <Select id="inc-sev" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="danger" className="flex-1" disabled={saving}>{saving ? 'Logging…' : 'Log incident'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function DayOfClient({ weddingId, events, vendors, incidents }: Readonly<Props>) {
  const [tab, setTab] = useState<'timeline' | 'contacts' | 'incidents'>('timeline')
  const [showIncident, setShowIncident] = useState(false)
  const router = useRouter()

  const activeIncidents = incidents.filter(i => !i.resolvedAt)

  const toggleEvent = async (eventId: string, isComplete: boolean) => {
    await fetch(`/api/weddings/${weddingId}/timeline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, isComplete: !isComplete }),
    })
    router.refresh()
  }

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Execution</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Day-of</h1>
            <p className="text-sm text-zinc-400 mt-2">
              {events.filter(e => e.isComplete).length}/{events.length} events done
              {activeIncidents.length > 0 && <span className="ml-2 text-red-500 font-semibold">· {activeIncidents.length} active incident{activeIncidents.length !== 1 ? 's' : ''}</span>}
            </p>
          </div>
          <Button onClick={() => setShowIncident(true)} size="sm" variant="danger">
            <AlertTriangle size={14} /> Log incident
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['timeline', 'contacts', 'incidents'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t === 'contacts' ? 'Emergency contacts' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'incidents' && activeIncidents.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{activeIncidents.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'timeline' && (
          events.length === 0 ? (
            <EmptyState icon={<Zap size={40} />} title="No timeline events" description="Add events on the Timeline page first" />
          ) : (
            <div className="space-y-0">
              {events.map(ev => (
                <div key={ev.id} className="flex gap-5 group">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <button
                      onClick={() => void toggleEvent(ev.id, ev.isComplete)}
                      className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all hover:scale-105"
                      style={{ borderColor: ev.color ?? '#8B5CF6', backgroundColor: ev.isComplete ? (ev.color ?? '#8B5CF6') : 'transparent' }}
                    >
                      {ev.isComplete
                        ? <CheckCircle2 size={15} className="text-white" />
                        : <Circle size={15} style={{ color: ev.color ?? '#8B5CF6' }} />}
                    </button>
                    <div className="w-px flex-1 bg-zinc-100 mt-2" />
                  </div>
                  <div className="flex-1 pb-6">
                    <p className={`font-semibold text-sm ${ev.isComplete ? 'line-through text-zinc-400' : 'text-[#14161C]'}`}>{ev.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {format(new Date(ev.startTime), 'h:mm a')}
                      {ev.endTime && ` – ${format(new Date(ev.endTime), 'h:mm a')}`}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                    {ev.assignedRoleName && <p className="text-xs text-violet-500 mt-0.5">{ev.assignedRoleName}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'contacts' && (
          vendors.length === 0 ? (
            <EmptyState icon={<Phone size={40} />} title="No confirmed vendors" description="Confirmed and booked vendors appear here" />
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {vendors.map(v => (
                <div key={v.id} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#14161C]">{v.name}</p>
                    <p className="text-xs text-zinc-400">{v.category.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.contactPhone && (
                      <a href={`tel:${v.contactPhone}`} className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                        <Phone size={13} /> {v.contactPhone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'incidents' && (
          incidents.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={40} />} title="No incidents" description="Log any issues that arise on the day" />
          ) : (
            <div className="space-y-3">
              {incidents.map(inc => (
                <div key={inc.id} className={`rounded-xl p-4 ${SEV_COLOR[inc.severity] ?? 'border-l-4 border-zinc-300'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase">{inc.severity}</span>
                    <span className="text-xs text-zinc-400">{format(new Date(inc.reportedAt), 'h:mm a')}</span>
                    {inc.resolvedAt && <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Resolved</span>}
                  </div>
                  <p className="text-sm text-zinc-700">{inc.description}</p>
                  {inc.resolution && <p className="text-xs text-zinc-500 mt-1 italic">{inc.resolution}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showIncident && <LogIncidentModal weddingId={weddingId} onClose={() => setShowIncident(false)} />}
    </div>
  )
}
