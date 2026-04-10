'use client'
import { use, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { MoodboardTab } from '@/components/features/moodboard-components'

interface WeddingEvent { id: string; name: string; type: string; date: string }

export default function MoodboardPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const [eventFilter, setEventFilter] = useState<string | undefined>(undefined)
  const [showEventDropdown, setShowEventDropdown] = useState(false)

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const r = await fetch(`/api/weddings/${wid}/events`); if (!r.ok) throw new Error('Failed to load events'); return r.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })

  const activeEventLabel = eventFilter ? (events.find(e => e.id === eventFilter)?.name ?? 'All events') : 'All events'

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Boards</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 pt-6 pb-0">
        <div className="flex items-center gap-4">
          {eventsLoading ? <Spinner size="sm" /> : (
            <div className="relative">
              <button onClick={() => setShowEventDropdown(v => !v)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
                {activeEventLabel}
                <ChevronDown size={14} className="text-zinc-500" />
              </button>
              {showEventDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEventDropdown(false)} aria-hidden />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 min-w-44">
                    {[{ id: undefined, name: 'All events' }, ...events.map(e => ({ id: e.id, name: e.name }))].map(opt => (
                      <button key={opt.id ?? '__all__'} onClick={() => { setEventFilter(opt.id); setShowEventDropdown(false) }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-zinc-50 ${eventFilter === opt.id ? 'font-semibold text-violet-700' : 'text-zinc-700'}`}>
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <MoodboardTab weddingId={wid} eventId={eventFilter} />
      </div>
    </div>
  )
}
