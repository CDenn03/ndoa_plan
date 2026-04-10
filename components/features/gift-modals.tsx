'use client'
import { useState } from 'react'
import { Button, Input, Label, Select, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'

export interface GiftRegistryItem {
  id: string; name: string; description?: string | null; url?: string | null
  estimatedPrice?: number | null; quantity: number; priority: number; eventId?: string | null
}
export interface GiftReceived {
  id: string; giverName: string; description: string; estimatedValue?: number | null
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
        toast('Registry item updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, description: form.description || null, url: form.url || null, estimatedPrice: form.estimatedPrice ? Number.parseFloat(form.estimatedPrice) : null, quantity: Number.parseInt(form.quantity), priority: Number.parseInt(form.priority), eventId: eventId ?? null }),
        })
        if (!res.ok) throw new Error('Failed to add')
        toast('Item added to registry', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['gifts-registry', weddingId] })
      onDone(); onClose()
    } catch { toast('Failed to save item', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={item ? 'Edit registry item' : 'Add registry item'}>
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
    giverName: gift?.giverName ?? '', description: gift?.description ?? '',
    estimatedValue: gift?.estimatedValue ? String(gift.estimatedValue) : '',
    status: gift?.status ?? 'RECEIVED', thankYouSent: gift?.thankYouSent ?? false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true)
    try {
      if (gift) {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/received/${gift.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giverName: form.giverName, description: form.description, estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, status: form.status, thankYouSent: form.thankYouSent }),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast('Gift updated', 'success')
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/gifts/received`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giverName: form.giverName, description: form.description, estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, eventId: eventId ?? null }),
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
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
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
      <div className="group flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C]">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.estimatedPrice != null && <span className="text-xs text-zinc-400">{fmt(item.estimatedPrice)}</span>}
            <span className="text-xs text-zinc-400">Qty: {item.quantity}</span>
            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:underline">Link</a>}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>
          <button onClick={handleDelete} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
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
      <div className="group flex items-center gap-3 py-3 px-4 border border-zinc-100 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#14161C]">{gift.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-400">From {gift.giverName}</span>
            {gift.thankYouSent && <span className="text-xs text-emerald-500">Thank you sent</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {gift.estimatedValue != null && <p className="text-sm font-bold text-[#14161C]">{fmt(gift.estimatedValue)}</p>}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button onClick={() => setEditing(true)} className="p-1 text-zinc-300 hover:text-violet-500" aria-label="Edit"><Pencil size={13} /></button>
            <button onClick={handleDelete} className="p-1 text-zinc-300 hover:text-red-400" aria-label="Delete"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
      {editing && <AddReceivedGiftModal weddingId={weddingId} gift={gift} onClose={() => setEditing(false)} onDone={onRefresh} />}
    </>
  )
}
