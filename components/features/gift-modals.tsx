'use client'
import { useState } from 'react'
import { Button, Input, Label, Select, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Pencil, Trash2, Plus, Heart, Gift, CheckCircle2 } from 'lucide-react'

export interface GiftRegistryItem {
  id: string; name: string; description?: string | null; url?: string | null
  estimatedPrice?: number | null; quantity: number; priority: number; eventId?: string | null
}
export interface GiftReceived {
  id: string; giverName: string; giverPhone?: string | null; description: string; estimatedValue?: number | null
  status: string; thankYouSent: boolean; eventId?: string | null; receivedAt?: string
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
    status: gift?.status ?? 'RECEIVED', thankYouSent: gift?.thankYouSent ?? false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (gift) {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giverName: form.giverName, giverPhone: form.giverPhone || null, description: form.description, estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, status: form.status, thankYouSent: form.thankYouSent }),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast('Gift updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/received`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giverName: form.giverName, giverPhone: form.giverPhone || null, description: form.description, estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, eventId: eventId ?? null }),
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
        <div><Label htmlFor="gift-giver">Giver name *</Label>
          <Input id="gift-giver" value={form.giverName} onChange={e => setForm(f => ({ ...f, giverName: e.target.value }))} placeholder="Aunt Jane" required /></div>
        <div><Label htmlFor="gift-phone">Giver's phone (optional)</Label>
          <Input id="gift-phone" value={form.giverPhone} onChange={e => setForm(f => ({ ...f, giverPhone: e.target.value }))} placeholder="+254712345678" /></div>
        <div><Label htmlFor="gift-desc">Description *</Label>
          <Input id="gift-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Dinner set" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="gift-val">Estimated value (KES)</Label>
            <Input id="gift-val" type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="5000" min="0" /></div>
          <div><Label htmlFor="gift-status">Status</Label>
            <Select id="gift-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="RECEIVED">Received</option>
              <option value="THANKED">Thanked</option>
              <option value="RETURNED">Returned</option>
            </Select></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#14161C]/60 cursor-pointer">
          <input type="checkbox" checked={form.thankYouSent} onChange={e => setForm(f => ({ ...f, thankYouSent: e.target.checked }))} className="rounded" />
          Thank you note sent
        </label>
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

  const handleDelete = async () => {
    if (!confirm('Delete this gift record?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
      toast('Gift deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <>
      <div className="group flex items-center gap-3 py-3 px-4 border border-[#1F4D3A]/8 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C]">{gift.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#14161C]/40">From {gift.giverName}</span>
            {gift.thankYouSent && <span className="text-xs text-emerald-500">Thank you sent</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {gift.estimatedValue != null && <p className="text-sm font-bold text-[#14161C]">{fmt(gift.estimatedValue)}</p>}
          <div className="flex items-center gap-1 ">
            <button onClick={() => setEditing(true)} className="p-1 text-[#14161C]/25 hover:text-[#1F4D3A]/70" aria-label="Edit"><Pencil size={13} /></button>
            <button onClick={handleDelete} className="p-1 text-[#14161C]/25 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
          </div>
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

function ReceivedGiftActions({ gift, weddingId, onRefresh }: Readonly<{
  gift: GiftReceived; weddingId: string; onRefresh: () => void
}>) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this gift record?')) return
    try {
      await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['gifts-received', weddingId] })
      toast('Gift deleted', 'success'); onRefresh()
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <>
      <div className="flex gap-1 ">
        <button onClick={() => setEditing(true)} className="p-1 text-[#14161C]/25 hover:text-[#1F4D3A]/70" aria-label="Edit"><Pencil size={13} /></button>
        <button onClick={handleDelete} className="p-1 text-[#14161C]/25 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
      </div>
      {editing && <AddReceivedGiftModal weddingId={weddingId} gift={gift} onClose={() => setEditing(false)} onDone={onRefresh} />}
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

export function ReceivedList({ gifts, weddingId, onRefresh, onAdd }: Readonly<{
  gifts: GiftReceived[]; weddingId: string; onRefresh: () => void; onAdd: () => void
}>) {
  if (gifts.length === 0) return (
    <EmptyState icon={<Gift size={40} />} title="No gifts recorded" description="Track gifts received and send thank-yous"
      action={<Button onClick={onAdd}><Plus size={14} /> Record gift</Button>} />
  )
  return (
    <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
      {gifts.map(gift => (
        <div key={gift.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0 group">
          <div className="w-9 h-9 rounded-full bg-[#1F4D3A]/8 flex items-center justify-center text-xs font-bold text-[#1F4D3A] flex-shrink-0">
            {gift.giverName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#14161C]">{gift.giverName}</p>
            <p className="text-xs text-[#14161C]/40 mt-0.5">{gift.description}</p>
            {gift.giverPhone && <p className="text-xs text-[#14161C]/40">{gift.giverPhone}</p>}
            {gift.receivedAt && <p className="text-xs text-[#14161C]/40">{format(new Date(gift.receivedAt), 'MMM d, yyyy')}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              {gift.estimatedValue != null && <p className="text-sm font-bold text-[#14161C]">{fmt(gift.estimatedValue)}</p>}
              {gift.thankYouSent
                ? <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold"><CheckCircle2 size={12} /> Thanked</span>
                : <span className="text-xs text-amber-500 font-semibold">Thank-you pending</span>}
            </div>
            <ReceivedGiftActions gift={gift} weddingId={weddingId} onRefresh={onRefresh} />
          </div>
        </div>
      ))}
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
