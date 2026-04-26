'use client'
import { useState } from 'react'
import { Heart, Plus, CheckCircle2 } from 'lucide-react'
import { Button, Input, Label, Badge, EmptyState, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface DowryItem {
  id: string; name: string; quantity: number; estimatedValue?: number | null
  agreedValue?: number | null; status: string; notes?: string | null
}

interface Props {
  weddingId: string
  items: DowryItem[]
}

const STATUS_BADGE: Record<string, 'pending' | 'confirmed' | 'maybe'> = {
  PENDING: 'pending', AGREED: 'confirmed', DELIVERED: 'maybe',
}

function AddDowryModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '1', estimatedValue: '', notes: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/dowry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, quantity: Number.parseInt(form.quantity), estimatedValue: form.estimatedValue ? Number.parseFloat(form.estimatedValue) : null, notes: form.notes || null }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Item added', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to add item', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add dowry item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="dowry-name">Item name *</Label>
          <Input id="dowry-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Goats" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dowry-qty">Quantity</Label>
            <Input id="dowry-qty" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="1" />
          </div>
          <div>
            <Label htmlFor="dowry-val">Est. value (KES)</Label>
            <Input id="dowry-val" type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="50000" min="0" />
          </div>
        </div>
        <div>
          <Label htmlFor="dowry-notes">Notes</Label>
          <Input id="dowry-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add item'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function DowryClient({ weddingId, items }: Readonly<Props>) {
  const [showAdd, setShowAdd] = useState(false)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  const delivered = items.filter(i => i.status === 'DELIVERED').length
  const agreed = items.filter(i => i.status === 'AGREED').length
  const allSorted = items.length > 0 && delivered === items.length

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Traditional</p>
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Dowry Tracker</h1>
            <p className="text-sm text-[#14161C]/40 mt-2">{items.length} items · {agreed} agreed · {delivered} delivered</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add item</Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {items.length === 0 ? (
          <EmptyState
            icon={<Heart size={40} />}
            title="No dowry items yet"
            description="Track items to be negotiated and delivered during the traditional ceremony"
            action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add item</Button>}
          />
        ) : (
          <>
            {allSorted && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">All items sorted</p>
                  <p className="text-xs text-emerald-600">Every dowry item has been delivered.</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 py-4 px-6 border-b border-[#1F4D3A]/8 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#14161C]">{item.name}</p>
                      <Badge variant={STATUS_BADGE[item.status] ?? 'default'}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-[#14161C]/40 mt-0.5">Qty: {item.quantity}</p>
                    {item.notes && <p className="text-xs text-[#14161C]/40">{item.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    {item.estimatedValue != null && (
                      <p className="text-xs text-[#14161C]/40">Est. {fmt(item.estimatedValue)}</p>
                    )}
                    {item.agreedValue != null && (
                      <p className="text-sm font-bold text-[#14161C]">Agreed {fmt(item.agreedValue)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAdd && <AddDowryModal weddingId={weddingId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
