'use client'
import { useState } from 'react'
import { Button, Input, Label, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, Heart, Gift, CheckCircle2, Home, DollarSign, HandHeart, Send } from 'lucide-react'

export interface GiftRegistryItem {
  id: string; name: string; description?: string | null; url?: string | null
  estimatedPrice?: number | null; quantity: number; priority: number; eventId?: string | null
}
export interface GiftReceived {
  id: string; giverName?: string | null; giverPhone?: string | null; description: string; estimatedValue?: number | null
  status: string; disposition?: string | null; thankYouSent: boolean; eventId?: string | null; receivedAt?: string
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

export function AddRegistryModal({ weddingId, eventId, item, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; item?: GiftRegistryItem; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: item?.name ?? '', description: item?.description ?? '', url: item?.url ?? '',
    estimatedPrice: item?.estimatedPrice ? String(item.estimatedPrice) : '',
    quantity: item ? String(item.quantity) : '1', priority: item ? String(item.priority) : '2',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (item) {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/registry/${item.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, description: form.description || null, url: form.url || null, estimatedPrice: form.estimatedPrice ? Number.parseFloat(form.estimatedPrice) : null, quantity: Number.parseInt(form.quantity), priority: Number.parseInt(form.priority) }),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast('Wish list item updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, description: form.description || null, url: form.url || null, estimatedPrice: form.estimatedPrice ? Number.parseFloat(form.estimatedPrice) : null, quantity: Number.parseInt(form.quantity), priority: Number.parseInt(form.priority), eventId: eventId ?? null }),
        })
        if (!res.ok) throw new Error('Failed to add')
        toast('Item added to wish list', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId] })
      onDone(); onClose()
    } catch { toast('Failed to save item', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={item ? 'Edit wish list item' : 'Add wish list item'}>
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
        <div><Label htmlFor="reg-desc">Description</Label>
          <Input id="reg-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : item ? 'Save' : 'Add item'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AddReceivedGiftModal({ weddingId, eventId, gift, onClose, onDone }: Readonly<{
  weddingId: string; eventId?: string; gift?: GiftReceived; onClose: () => void; onDone: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    giverName: gift?.giverName ?? '', giverPhone: gift?.giverPhone ?? '', description: gift?.description ?? '',
    estimatedValue: gift?.estimatedValue ? String(gift.estimatedValue) : '',
    thankYouSent: gift?.thankYouSent ?? false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (gift) {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giverName: form.giverName || null, giverPhone: form.giverPhone || null, description: form.description, estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, thankYouSent: form.thankYouSent }),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast('Gift updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/received`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giverName: form.giverName || null, giverPhone: form.giverPhone || null, description: form.description, estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, eventId: eventId ?? null }),
        })
        if (!res.ok) throw new Error('Failed to record')
        toast('Gift recorded', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
      onDone(); onClose()
    } catch { toast('Failed to save gift', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={gift ? 'Edit gift' : 'Record received gift'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="gift-desc">Gift description *</Label>
          <Input id="gift-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Dinner set, blender, cash gift…" required /></div>
        <div><Label htmlFor="gift-giver">Giver name (optional)</Label>
          <Input id="gift-giver" value={form.giverName} onChange={e => setForm(f => ({ ...f, giverName: e.target.value }))} placeholder="Aunt Jane, Uncle Tom…" /></div>
        <div><Label htmlFor="gift-phone">Giver's phone (optional)</Label>
          <Input id="gift-phone" value={form.giverPhone} onChange={e => setForm(f => ({ ...f, giverPhone: e.target.value }))} placeholder="+254712345678" /></div>
        <div><Label htmlFor="gift-val">Estimated value (KES)</Label>
          <Input id="gift-val" type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="5000" min="0" /></div>
        {gift && (form.giverName || form.giverPhone) && (
          <label className="flex items-center gap-2.5 text-sm text-[#14161C]/70 cursor-pointer select-none">
            <input type="checkbox" checked={form.thankYouSent}
              onChange={e => setForm(f => ({ ...f, thankYouSent: e.target.checked }))}
              className="w-4 h-4 rounded accent-violet-600" />
            Thank you sent
          </label>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : gift ? 'Save' : 'Record gift'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function RegistryItemRow({ item, weddingId, onRefresh }: Readonly<{
  item: GiftRegistryItem; weddingId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this registry item?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/registry/${item.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId] })
      toast('Item deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <>
      <div className="group flex items-center gap-3 py-3 px-4 border border-[#1F4D3A]/8 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C]">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.estimatedPrice != null && <span className="text-xs text-[#14161C]/40">{fmt(item.estimatedPrice)}</span>}
            <span className="text-xs text-[#14161C]/40">Qty: {item.quantity}</span>
            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1F4D3A]/70 hover:underline">Link</a>}
          </div>
        </div>
        <div className="flex items-center gap-1  flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1 text-[#14161C]/25 hover:text-[#1F4D3A]/70" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1 text-[#14161C]/25 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
      {editing && <AddRegistryModal weddingId={weddingId} item={item} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}

export function ReceivedGiftRow({ gift, weddingId, onRefresh }: Readonly<{
  gift: GiftReceived; weddingId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)

  const canSendThankYou = !!(gift.giverName || gift.giverPhone)

  const handleDisposition = async (disposition: string) => {
    setUpdating(true)
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposition }),
      })
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
      toast(`Marked as ${disposition.toLowerCase()}`, 'success')
      onRefresh()
    } catch {
      toast('Failed to update', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleThankYou = async () => {
    if (!canSendThankYou) {
      toast('Cannot send thank you - no giver name or phone', 'error')
      return
    }
    setUpdating(true)
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thankYouSent: true }),
      })
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
      toast('Thank you marked as sent', 'success')
      onRefresh()
    } catch {
      toast('Failed to update', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this gift record?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
      toast('Gift deleted', 'success')
      onRefresh()
    } catch {
      toast('Failed to delete', 'error')
    }
  }

  const dispositionColors: Record<string, string> = {
    KEEP: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SELL: 'bg-amber-50 text-amber-700 border-amber-200',
    GIVE: 'bg-sky-50 text-sky-700 border-sky-200',
  }

  // Derive a single status label for the badge
  const statusBadge = (() => {
    if (gift.disposition === 'KEEP') return { label: 'Kept', cls: 'bg-emerald-50 text-emerald-700' }
    if (gift.disposition === 'SELL') return { label: 'Sold', cls: 'bg-amber-50 text-amber-700' }
    if (gift.disposition === 'GIVE') return { label: 'Given out', cls: 'bg-sky-50 text-sky-700' }
    if (gift.thankYouSent) return { label: 'Thanked', cls: 'bg-violet-50 text-violet-700' }
    return { label: 'Received', cls: 'bg-[#1F4D3A]/6 text-[#1F4D3A]' }
  })()

  return (
    <>
      <div className="group flex flex-col gap-3 py-4 px-4 border border-[#1F4D3A]/8 rounded-xl bg-white">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#14161C]">{gift.description}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {gift.giverName && <span className="text-xs text-[#14161C]/40">From {gift.giverName}</span>}
              {!gift.giverName && gift.giverPhone && <span className="text-xs text-[#14161C]/40">{gift.giverPhone}</span>}
              {!gift.giverName && !gift.giverPhone && <span className="text-xs text-[#14161C]/25 italic">Giver unknown</span>}
              {gift.estimatedValue != null && <span className="text-xs font-bold text-[#14161C]">{fmt(gift.estimatedValue)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60 transition-colors" aria-label="Edit">
              <Pencil size={13} />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500 transition-colors" aria-label="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => void handleDisposition('KEEP')}
            disabled={updating || gift.disposition === 'KEEP'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              gift.disposition === 'KEEP'
                ? dispositionColors.KEEP
                : 'border-[#1F4D3A]/12 text-[#14161C]/60 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Home size={12} /> Keep
          </button>
          <button
            onClick={() => void handleDisposition('SELL')}
            disabled={updating || gift.disposition === 'SELL'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              gift.disposition === 'SELL'
                ? dispositionColors.SELL
                : 'border-[#1F4D3A]/12 text-[#14161C]/60 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <DollarSign size={12} /> Sell
          </button>
          <button
            onClick={() => void handleDisposition('GIVE')}
            disabled={updating || gift.disposition === 'GIVE'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              gift.disposition === 'GIVE'
                ? dispositionColors.GIVE
                : 'border-[#1F4D3A]/12 text-[#14161C]/60 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'
            }`}
          >
            <HandHeart size={12} /> Give
          </button>

          {/* Thank you — hidden for anonymous gifts (no name or phone) */}
          {canSendThankYou && (!gift.thankYouSent ? (
            <button
              onClick={() => void handleThankYou()}
              disabled={updating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#1F4D3A]/12 text-[#14161C]/60 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors ml-auto"
            >
              <Send size={12} /> Mark as thanked
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 ml-auto">
              <CheckCircle2 size={12} /> Thanked
            </span>
          ))}
        </div>
      </div>
      {editing && <AddReceivedGiftModal weddingId={weddingId} gift={gift} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}

// ─── Action buttons (edit/delete only, used inside rich list rows) ────────────

function RegistryItemActions({ item, weddingId, onRefresh }: Readonly<{
  item: GiftRegistryItem; weddingId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this registry item?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/registry/${item.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId] })
      toast('Item deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <>
      <div className="flex gap-1 ">
        <button onClick={() => setEditing(true)} className="p-1 text-[#14161C]/25 hover:text-[#1F4D3A]/70" aria-label="Edit"><Pencil size={13} /></button>
        <button onClick={handleDelete} className="p-1 text-[#14161C]/25 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
      </div>
      {editing && <AddRegistryModal weddingId={weddingId} item={item} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}


// ─── Registry List ────────────────────────────────────────────────────────────

export function RegistryList({ items, weddingId, onRefresh, onAdd }: Readonly<{
  items: GiftRegistryItem[]; weddingId: string; onRefresh: () => void; onAdd: () => void
}>) {
  if (items.length === 0) return (
    <EmptyState icon={<Heart size={40} />} title="Wish list is empty" description="Add items you'd love to receive as gifts"
      action={<Button onClick={onAdd}><Plus size={14} /> Add item</Button>} />
  )
  return (
    <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0 group">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{item.name}</p>
            {item.description && <p className="text-xs text-[#14161C]/40 mt-0.5">{item.description}</p>}
            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1F4D3A]/70 hover:underline mt-0.5 block">View item →</a>}
          </div>
          <div className="text-right flex-shrink-0 flex items-center gap-3">
            <div>
              {item.estimatedPrice != null && <p className="text-sm font-bold text-[#14161C]">{fmt(item.estimatedPrice)}</p>}
              <p className="text-xs text-[#14161C]/40">Qty: {item.quantity}</p>
            </div>
            <RegistryItemActions item={item} weddingId={weddingId} onRefresh={onRefresh} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Received List ────────────────────────────────────────────────────────────

type DispositionFilter = 'all' | 'KEEP' | 'SELL' | 'GIVE'

export function ReceivedList({ gifts, weddingId, onRefresh, onAdd }: Readonly<{
  gifts: GiftReceived[]; weddingId: string; onRefresh: () => void; onAdd: () => void
}>) {
  const [filter, setFilter] = useState<DispositionFilter>('all')

  const tabs: { key: DispositionFilter; label: string }[] = [
    { key: 'all',  label: `All (${gifts.length})` },
    { key: 'KEEP', label: `Keep (${gifts.filter(g => g.disposition === 'KEEP').length})` },
    { key: 'SELL', label: `Sell (${gifts.filter(g => g.disposition === 'SELL').length})` },
    { key: 'GIVE', label: `Give (${gifts.filter(g => g.disposition === 'GIVE').length})` },
  ]

  const visible = filter === 'all' ? gifts : gifts.filter(g => g.disposition === filter)

  if (gifts.length === 0) return (
    <EmptyState icon={<Gift size={40} />} title="No gifts recorded" description="Track gifts received and send thank-yous"
      action={<Button onClick={onAdd}><Plus size={14} /> Record gift</Button>} />
  )

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === t.key ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <p className="text-sm text-[#14161C]/40 py-6 text-center">No gifts marked to {filter.toLowerCase()} yet.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(gift => (
            <ReceivedGiftRow key={gift.id} gift={gift} weddingId={weddingId} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Event Gifts Tab (shared between event detail + gifts dashboard) ───────────

export function EventGiftsTab({ weddingId, eventId, registry, received, onRefresh }: Readonly<{
  weddingId: string; eventId: string
  registry: GiftRegistryItem[]; received: GiftReceived[]; onRefresh: () => void
}>) {
  const [subTab, setSubTab] = useState<'wishlist' | 'received'>('wishlist')
  const [showAddReg, setShowAddReg] = useState(false)
  const [showAddRec, setShowAddRec] = useState(false)

  const evReg = registry.filter(r => r.eventId === eventId)
  const evRec = received.filter(r => r.eventId === eventId)
  const pendingThankYous = evRec.filter(r => !r.thankYouSent).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-[#1F4D3A]/6 p-1 rounded-xl w-fit">
          {(['wishlist', 'received'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${subTab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-[#14161C]/55 hover:text-[#14161C]/70'}`}>
              {t === 'wishlist' ? 'Wish List' : 'Received'}
              {t === 'received' && pendingThankYous > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5">{pendingThankYous}</span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => subTab === 'wishlist' ? setShowAddReg(true) : setShowAddRec(true)}>
          <Plus size={14} /> {subTab === 'wishlist' ? 'Add item' : 'Record gift'}
        </Button>
      </div>

      {subTab === 'wishlist' && <RegistryList items={evReg} weddingId={weddingId} onRefresh={onRefresh} onAdd={() => setShowAddReg(true)} />}
      {subTab === 'received' && <ReceivedList gifts={evRec} weddingId={weddingId} onRefresh={onRefresh} onAdd={() => setShowAddRec(true)} />}

      {showAddReg && <AddRegistryModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAddReg(false)} onDone={onRefresh} />}
      {showAddRec && <AddReceivedGiftModal weddingId={weddingId} eventId={eventId} onClose={() => setShowAddRec(false)} onDone={onRefresh} />}
    </div>
  )
}
