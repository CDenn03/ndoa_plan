'use client'
import { use, useState, useMemo } from 'react'
import { ImageIcon, CalendarDays } from 'lucide-react'
import { EmptyState, Spinner } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { MoodboardTab } from '@/components/features/moodboard-components'
import type { MoodCategory, MoodImage } from '@/components/features/moodboard-components'

interface WeddingEvent { id: string; name: string; type: string; date: string }

function OverallTab({ weddingId, events, onSelectEvent }: Readonly<{ weddingId: string; events: WeddingEvent[]; onSelectEvent: (id: string) => void }>) {
  const { data: allImages = [] } = useQuery<MoodImage[]>({
    queryKey: ['moodboard', weddingId],
    queryFn: async () => {
      const r = await fetch(`/api/weddings/${weddingId}/media`)
      if (!r.ok) throw new Error('Failed')
      const items = await r.json() as MoodImage[]
      return items.filter(i => i.linkedToType === 'moodboard' && i.mimeType?.startsWith('image/'))
    },
    staleTime: 30_000,
  })

  const { data: categories = [] } = useQuery<MoodCategory[]>({
    queryKey: ['vision-categories', weddingId],
    queryFn: async () => { const r = await fetch(`/api/weddings/${weddingId}/vision-categories`); if (!r.ok) throw new Error('Failed'); return r.json() as Promise<MoodCategory[]> },
    staleTime: 60_000,
  })

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; count: number }>()
    for (const e of events) map.set(e.id, { event: e, count: 0 })
    for (const img of allImages) {
      const k = img.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, count: 0 })
      const entry = map.get(k)
      if (entry) entry.count++
    }
    return map
  }, [allImages, events])

  if (allImages.length === 0 && categories.length === 0) return (
    <EmptyState icon={<ImageIcon size={40} className="text-zinc-200" />} title="No boards yet"
      description="Select an event tab to create boards and collect inspiration photos" />
  )

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Boards</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{categories.length}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Photos</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{allImages.length}</p></div>
      </div>

      {events.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
          {Array.from(byEvent.entries()).map(([key, { event, count }]) => {
            if (count === 0) return null
            return (
              <button key={key} onClick={() => event && onSelectEvent(event.id)}
                className="w-full rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4 hover:border-zinc-200 hover:bg-zinc-50 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-zinc-400" />
                  <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div><p className="text-xs text-zinc-400">Photos</p><p className="text-sm font-bold text-violet-600">{count}</p></div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MoodboardPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const [activeTab, setActiveTab] = useState('__overall__')

  const { data: events = [], isLoading: eventsLoading } = useQuery<WeddingEvent[]>({
    queryKey: ['events', wid],
    queryFn: async () => { const r = await fetch(`/api/weddings/${wid}/events`); if (!r.ok) throw new Error('Failed'); return r.json() as Promise<WeddingEvent[]> },
    staleTime: 60_000,
  })

  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <div className="flex items-end justify-between gap-4 mb-1">
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Boards</h1>
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px mt-6">
            {eventsLoading ? <div className="pb-4"><Spinner size="sm" /></div> : (
              tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                  {t.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {activeTab === '__overall__'
          ? <OverallTab weddingId={wid} events={events} onSelectEvent={setActiveTab} />
          : activeEvent
            ? <MoodboardTab weddingId={wid} eventId={activeEvent.id} />
            : null}
      </div>
    </div>
  )
}
