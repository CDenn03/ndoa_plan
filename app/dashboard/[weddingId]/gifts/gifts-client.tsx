'use client'
import { useState } from 'react'
import { Gift, Plus, CheckCircle2, Heart } from 'lucide-react'
import { Button, Input, Label, Badge, EmptyState, Modal, Spinner } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface RegistryItem {
  id: string; name: string; description?: string | null; url?: string | null
  estimatedPrice?: number | null; quantity: number; priority: number
}

interface ReceivedGift {
  id: string; giverName: string; description: string; estimatedValue?: number | null
  status: string; receivedAt: string; thankYouSent: boolean
}

interface Props {
  weddingId: string
  registry: RegistryItem[]
  received: ReceivedGift[]
}

function AddRegistryModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', url: '', estimatedPrice: '', quantity: '1', priority: '2' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : null, quantity: parseInt(form.quantity), priority: parseInt(form.priority) }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Item added to registry', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to add item', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Add registry item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reg-name">Item name *</Label>
          <Input id="reg-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="KitchenAid mixer" required />
        </div>
        <div>
          <Label htmlFor="reg-url">Link (optional)</Label>
          <Input id="reg-url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="reg-price">Est. price (KES)</Label>
            <Input id="reg-price" type="number" value={form.estimatedPrice} onChange={e => setForm(f => ({ ...f, estimatedPrice: e.target.value }))} placeholder="15000" min="0" />
          </div>
          <div>
            <Label htmlFor="reg-qty">Quantity</Label>
            <Input id="reg-qty" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="1" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add item'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddReceivedModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const { toast } = useToast()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ giverName: '', description: '', estimatedValue: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null }),
      })
      if (!res.ok) throw new Error('Failed')
      toast('Gift recorded', 'success')
      router.refresh()
      onClose()
    } catch {
      toast('Failed to record gift', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Record received gift">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="gift-giver">Giver name *</Label>
          <Input id="gift-giver" value={form.giverName} onChange={e => setForm(f => ({ ...f, giverName: e.target.value }))} placeholder="Aunt Jane" required />
        </div>
        <div>
          <Label htmlFor="gift-desc">Description *</Label>
          <Input id="gift-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Dinner set" required />
        </div>
        <div>
          <Label htmlFor="gift-val">Estimated value (KES)</Label>
          <Input id="gift-val" type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="5000" min="0" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Record gift'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function GiftsClient({ weddingId, registry, received }: Readonly<Props>) {
  const [tab, setTab] = useState<'registry' | 'received'>('registry')
  const [showAddRegistry, setShowAddRegistry] = useState(false)
  const [showAddReceived, setShowAddReceived] = useState(false)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  const pendingThankYous = received.filter(r => !r.thankYouSent).length

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Content</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Gifts</h1>
            <p className="text-sm text-zinc-400 mt-2">
              {registry.length} registry items · {received.length} received
              {pendingThankYous > 0 && <span className="ml-2 text-amber-500 font-semibold">· {pendingThankYous} thank-yous pending</span>}
            </p>
          </div>
          <Button onClick={() => tab === 'registry' ? setShowAddRegistry(true) : setShowAddReceived(true)} size="sm">
            <Plus size={14} /> {tab === 'registry' ? 'Add item' : 'Record gift'}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['registry', 'received'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-white text-[#14161C] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t === 'registry' ? 'Registry' : 'Received'}
            </button>
          ))}
        </div>

        {tab === 'registry' && (
          registry.length === 0 ? (
            <EmptyState icon={<Heart size={40} />} title="Registry is empty" description="Add items you'd love to receive as gifts"
              action={<Button onClick={() => setShowAddRegistry(true)}><Plus size={14} />Add item</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {registry.map(item => (
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
        )}

        {tab === 'received' && (
          received.length === 0 ? (
            <EmptyState icon={<Gift size={40} />} title="No gifts recorded" description="Track gifts received and send thank-yous"
              action={<Button onClick={() => setShowAddReceived(true)}><Plus size={14} />Record gift</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              {received.map(gift => (
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
                    {gift.thankYouSent ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold"><CheckCircle2 size={12} /> Thanked</span>
                    ) : (
                      <span className="text-xs text-amber-500 font-semibold">Thank-you pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showAddRegistry && <AddRegistryModal weddingId={weddingId} onClose={() => setShowAddRegistry(false)} />}
      {showAddReceived && <AddReceivedModal weddingId={weddingId} onClose={() => setShowAddReceived(false)} />}
    </div>
  )
}
