'use client'
import { useState, useMemo } from 'react'
import { Gift, Plus, CheckCircle2, Heart, CalendarDays } from 'lucide-react'
import { Button, Input, Label, EmptyState, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'

interface RegistryItem {
  id: string; eventId?: string | null; name: string; description?: string | null
  url?: string | null; estimatedPrice?: number | null; quantity: number; priority: number
}
interface ReceivedGift {
  id: string; eventId?: string | null; giverName: string; description: string
  estimatedValue?: number | null; status: string; receivedAt: string; thankYouSent: boolean
}
interface WeddingEvent { id: string; name: string; type: string; date: string }
interface Props {
  weddingId: string; events: WeddingEvent[]
  registry: RegistryItem[]; received: ReceivedGift[]; onRefresh: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function AddRegistryModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', url: '', estimatedPrice: '', quantity: '1', priority: '2' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : null,
          quantity: parseInt(form.quantity), priority: parseInt(form.priority),
          eventId: eventId ?? null,
        }),
      })
      if (!res.ok) throw new Error()
      toast('Item added to registry', 'success'); onDone(); onClose()
    } catch { toast('Failed to add item', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Add registry item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="reg-name">Item name *</Label>
          <Input id="reg-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="KitchenAid mixer" required /></div>
        <div><Label htmlFor="reg-url">Link (optional)</Label>
          <Input id="reg-url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="reg-price">Est. price (KES)</Label>
            <Input id="reg-price" type="number" value={form.estimatedPrice} onChange={e => setForm(f => ({ ...f, estimatedPrice: e.target.value }))} placeholder="15000" min="0" /></div>
          <div><Label htmlFor="reg-qty">Quantity</Label>
            <Input id="reg-qty" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="1" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add item'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddReceivedModal({ weddingId, eventId, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ giverName: '', description: '', estimatedValue: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/received`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
          eventId: eventId ?? null,
        }),
      })
      if (!res.ok) throw new Error()
      toast('Gift recorded', 'success'); onDone(); onClose()
    } catch { toast('Failed to record gift', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title="Record received gift">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="gift-giver">Giver name *</Label>
          <Input id="gift-giver" value={form.giverName} onChange={e => setForm(f => ({ ...f, giverName: e.target.value }))} placeholder="Aunt Jane" required /></div>
        <div><Label htmlFor="gift-desc">Description *</Label>
          <Input id="gift-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Dinner set" required /></div>
        <div><Label htmlFor="gift-val">Estimated value (KES)</Label>
          <Input id="gift-val" type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="5000" min="0" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record gift'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function RegistryList({ items, onAdd }: Readonly<{ items: RegistryItem[]; onAdd: () => void }>) {
  if (items.length === 0) return (
    <EmptyState icon={<Heart size={40} />} title="Registry is empty" description="Add items you'd love to receive as gifts"
      action={<Button onClick={onAdd}><Plus size={14} />Add item</Button>} />
  )
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{item.name}</p>
            {item.description && <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>}
            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:underline mt-0.5 block">View item →</a>}
          </div>
          <div className="text-right flex-shrink-0">
            {item.estimatedPrice && <p className="text-sm font-bold text-[#14161C]">{fmt(item.estimatedPrice)}</p>}
            <p className="text-xs text-zinc-400">Qty: {item.quantity}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReceivedList({ gifts, onAdd }: Readonly<{ gifts: ReceivedGift[]; onAdd: () => void }>) {
  if (gifts.length === 0) return (
    <EmptyState icon={<Gift size={40} />} title="No gifts recorded" description="Track gifts received and send thank-yous"
      action={<Button onClick={onAdd}><Plus size={14} />Record gift</Button>} />
  )
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {gifts.map(gift => (
        <div key={gift.id} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 last:border-0">
          <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0">
            {gift.giverName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{gift.giverName}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{gift.description}</p>
            <p className="text-xs text-zinc-400">{format(new Date(gift.receivedAt), 'MMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {gift.estimatedValue && <p className="text-sm font-bold text-[#14161C]">{fmt(gift.estimatedValue)}</p>}
            {gift.thankYouSent
              ? <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold"><CheckCircle2 size={12} /> Thanked</span>
              : <span className="text-xs text-amber-500 font-semibold">Thank-you pending</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function OverallTab({ registry, received, events }: Readonly<{ registry: RegistryItem[]; received: ReceivedGift[]; events: WeddingEvent[] }>) {
  const pendingThankYous = received.filter(r => !r.thankYouSent).length
  const totalValue = received.reduce((s, r) => s + (r.estimatedValue ?? 0), 0)

  const byEvent = useMemo(() => {
    const map = new Map<string, { event: WeddingEvent | null; reg: RegistryItem[]; rec: ReceivedGift[] }>()
    for (const e of events) map.set(e.id, { event: e, reg: [], rec: [] })
    for (const r of registry) {
      const k = r.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, reg: [], rec: [] })
      map.get(k)!.reg.push(r)
    }
    for (const r of received) {
      const k = r.eventId ?? '__unassigned__'
      if (!map.has(k)) map.set(k, { event: null, reg: [], rec: [] })
      map.get(k)!.rec.push(r)
    }
    return map
  }, [registry, received, events])

  if (registry.length === 0 && received.length === 0) return (
    <EmptyState icon={<Gift size={40} />} title="No gifts yet"
      description="Add registry items and record received gifts inside each event tab" />
  )

  return (
    <div className="space-y-8">
      <div className="flex gap-8 divide-x divide-zinc-100 flex-wrap">
        <div className="pr-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Registry items</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{registry.length}</p></div>
        <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Gifts received</p>
          <p className="text-2xl font-extrabold text-[#14161C]">{received.length}</p></div>
        {totalValue > 0 && <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Total value</p>
          <p className="text-2xl font-extrabold text-emerald-600">{fmt(totalValue)}</p></div>}
        {pendingThankYous > 0 && <div className="px-8"><p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Thank-yous pending</p>
          <p className="text-2xl font-extrabold text-amber-500">{pendingThankYous}</p></div>}
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">By event</p>
        {Array.from(byEvent.entries()).map(([key, { event, reg, rec }]) => {
          if (reg.length === 0 && rec.length === 0) return null
          return (
            <div key={key} className="rounded-2xl border border-zinc-100 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-zinc-400" />
                <p className="text-sm font-bold text-[#14161C]">{event?.name ?? 'Unassigned'}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="text-xs text-zinc-400">Registry</p><p className="text-sm font-bold text-violet-600">{reg.length}</p></div>
                <div><p className="text-xs text-zinc-400">Received</p><p className="text-sm font-bold text-emerald-600">{rec.length}</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventGiftsTab({ weddingId, event, registry, received, onRefresh }: Readonly<{
  weddingId: string; event: WeddingEvent
  registry: RegistryItem[]; received: ReceivedGift[]; onRefresh: () => void
}>) {
  const [subTab, setSubTab] = useState<'registry' | 'received'>('registry')
  const [showAddReg, setShowAddReg] = useState(false)
  const [showAddRec, setShowAddRec] = useState(false)
  const evReg = useMemo(() => registry.filter(r => r.eventId === event.id), [registry, event.id])
  const evRec = useMemo(() => received.filter(r => r.eventId === event.id), [received, event.id])
  const pendingThankYous = evRec.filter(r => !r.thankYouSent).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['registry', 'received'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {t === 'registry' ? 'Registry' : 'Received'}
              {t === 'received' && pendingThankYous > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5">{pendingThankYous}</span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => subTab === 'registry' ? setShowAddReg(true) : setShowAddRec(true)}>
          <Plus size={14} /> {subTab === 'registry' ? 'Add item' : 'Record gift'}
        </Button>
      </div>
      {subTab === 'registry' && <RegistryList items={evReg} onAdd={() => setShowAddReg(true)} />}
      {subTab === 'received' && <ReceivedList gifts={evRec} onAdd={() => setShowAddRec(true)} />}
      {showAddReg && <AddRegistryModal weddingId={weddingId} eventId={event.id} onClose={() => setShowAddReg(false)} onDone={onRefresh} />}
      {showAddRec && <AddReceivedModal weddingId={weddingId} eventId={event.id} onClose={() => setShowAddRec(false)} onDone={onRefresh} />}
    </div>
  )
}

export function GiftsClient({ weddingId, events, registry, received, onRefresh }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState('__overall__')
  const tabs = [{ key: '__overall__', label: 'Overall' }, ...events.map(e => ({ key: e.id, label: e.name }))]
  const activeEvent = events.find(e => e.id === activeTab)
  const pendingThankYous = received.filter(r => !r.thankYouSent).length

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-0 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Gifts</h1>
          <p className="text-sm text-zinc-400 mt-2 mb-6">
            {registry.length} registry items · {received.length} received
            {pendingThankYous > 0 && <span className="ml-2 text-amber-500 font-semibold">· {pendingThankYous} thank-yous pending</span>}
          </p>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === t.key ? 'border-[#14161C] text-[#14161C]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 py-10">
        {activeTab === '__overall__'
          ? <OverallTab registry={registry} received={received} events={events} />
          : activeEvent
            ? <EventGiftsTab weddingId={weddingId} event={activeEvent} registry={registry} received={received} onRefresh={onRefresh} />
            : null}
      </div>
    </div>
  )
}
