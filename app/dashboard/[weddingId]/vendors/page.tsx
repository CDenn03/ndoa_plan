'use client'
import { useState, useMemo, use } from 'react'
import { ShoppingBag, Search, Plus, Phone, Mail, X, MessageCircle, ChevronDown, ChevronUp, Send, Shield, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Select, Label, Badge, EmptyState, Spinner, Modal } from '@/components/ui'
import { useVendors, useVendorStats, useAddVendor, useUpdateVendorStatus, useUpdateVendor } from '@/hooks/use-vendors'
import { useWeddingStore } from '@/store/wedding-store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { LocalVendor } from '@/types'
import { useToast } from '@/components/ui/toast'

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'maybe' | 'declined'> = {
  CONFIRMED: 'confirmed', BOOKED: 'maybe', ENQUIRED: 'pending', QUOTED: 'pending', CANCELLED: 'declined', COMPLETED: 'confirmed',
}

const CATEGORIES = ['CATERING','PHOTOGRAPHY','VIDEOGRAPHY','FLORIST','MUSIC_DJ','BAND','TRANSPORT','DECOR','CAKE','ATTIRE','VENUE','OFFICIANT','HAIR_MAKEUP','ENTERTAINMENT','SECURITY','OTHER']

function VendorNotes({ vendorId, weddingId }: Readonly<{ vendorId: string; weddingId: string }>) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['vendor-notes', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/notes`)
      if (!res.ok) return []
      return res.json() as Promise<{ id: string; content: string; createdBy: string; createdAt: string }[]>
    },
  })

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-notes', vendorId] })
      setNote('')
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!note.trim()) return
    addNote.mutate(note.trim())
  }

  return (
    <div className="px-6 pb-5 pt-3 border-t border-zinc-100 space-y-3">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Notes log</p>
      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-zinc-400">No notes yet. Log a communication update below.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
          {notes.map(n => (
            <div key={n.id} className="text-xs bg-zinc-50 rounded-xl px-3 py-2.5">
              <p className="text-[#14161C] leading-relaxed">{n.content}</p>
              <p className="text-zinc-400 mt-1">{n.createdBy} · {format(new Date(n.createdAt), 'MMM d, h:mm a')}</p>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Log a note or update…"
          className="flex-1 h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="lavender" disabled={addNote.isPending || !note.trim()}>
          <Send size={12} />
        </Button>
      </form>
    </div>
  )
}

function EditVendorModal({ vendor, weddingId, onClose }: Readonly<{ vendor: LocalVendor; weddingId: string; onClose: () => void }>) {
  const update = useUpdateVendor(weddingId)
  const [form, setForm] = useState({
    name: vendor.name, category: vendor.category,
    contactPhone: vendor.contactPhone ?? '', contactEmail: vendor.contactEmail ?? '',
    amount: vendor.amount ? String(vendor.amount) : '',
    paidAmount: String(vendor.paidAmount),
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await update.mutateAsync({
      vendorId: vendor.id,
      data: {
        name: form.name, category: form.category,
        contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        paidAmount: parseFloat(form.paidAmount) || 0,
      },
      currentVersion: vendor.version,
    })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Edit vendor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label htmlFor="ev-name">Name *</Label>
          <Input id="ev-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
        <div><Label htmlFor="ev-cat">Category</Label>
          <Select id="ev-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="ev-phone">Phone</Label>
            <Input id="ev-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
          <div><Label htmlFor="ev-email">Email</Label>
            <Input id="ev-email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="ev-amount">Total amount (KES)</Label>
            <Input id="ev-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="0" /></div>
          <div><Label htmlFor="ev-paid">Paid (KES)</Label>
            <Input id="ev-paid" type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} placeholder="0" min="0" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function VendorEventAssign({ vendorId, weddingId }: Readonly<{ vendorId: string; weddingId: string }>) {
  const qc = useQueryClient()
  const { data: assignments = [] } = useQuery<{ id: string; eventId: string; event: { id: string; name: string } }[]>({
    queryKey: ['vendor-events', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/events`)
      if (!res.ok) return []
      return res.json()
    },
  })
  const { data: allEvents = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['events', weddingId],
    queryFn: async () => { const res = await fetch(`/api/weddings/${weddingId}/events`); if (!res.ok) return []; return res.json() },
    staleTime: 60_000,
  })

  const assignedIds = new Set(assignments.map(a => a.eventId))

  const toggle = async (eventId: string, assigned: boolean) => {
    if (assigned) {
      await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/events`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
    } else {
      await fetch(`/api/weddings/${weddingId}/vendors/${vendorId}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
    }
    qc.invalidateQueries({ queryKey: ['vendor-events', vendorId] })
  }

  if (allEvents.length === 0) return null

  return (
    <div className="px-6 pb-5 pt-3 border-t border-zinc-100 space-y-2">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Assigned events</p>
      <div className="flex flex-wrap gap-1.5">
        {allEvents.map(ev => {
          const assigned = assignedIds.has(ev.id)
          return (
            <button key={ev.id} onClick={() => toggle(ev.id, assigned)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${assigned ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
              {assigned ? '✓ ' : ''}{ev.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VendorRow({ vendor, weddingId }: Readonly<{ vendor: LocalVendor; weddingId: string }>) {
  const updateStatus = useUpdateVendorStatus(weddingId)
  const qc = useQueryClient()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const extVendor = vendor as LocalVendor & { description?: string; isBackup?: boolean }

  const handleDelete = async () => {
    if (!confirm(`Delete ${vendor.name}?`)) return
    try {
      await fetch(`/api/weddings/${weddingId}/vendors/${vendor.id}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['vendors', weddingId] })
      toast('Vendor deleted', 'success')
    } catch { toast('Failed to delete vendor', 'error') }
  }

  return (
    <>
      <div className="border-b border-zinc-100 last:border-0">
        <div className="group flex items-center gap-4 py-4 px-6 hover:bg-stone-50 transition-colors">
          <div className="w-9 h-9 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xs font-bold text-violet-600 flex-shrink-0 relative">
            {vendor.name.charAt(0).toUpperCase()}
            {extVendor.isBackup && <Shield size={9} className="absolute -top-0.5 -right-0.5 text-zinc-400" aria-label="Backup vendor" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#14161C]">{vendor.name}</p>
              {extVendor.isBackup && <span className="text-[10px] text-zinc-400 font-medium">Backup</span>}
              {vendor.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-zinc-400">{vendor.category.replace(/_/g, ' ')}</span>
              {extVendor.description && <span className="text-xs text-zinc-400 truncate max-w-48">{extVendor.description}</span>}
              {vendor.contactPhone && (
                <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-600 transition-colors">
                  <Phone size={10} /> {vendor.contactPhone}
                </a>
              )}
              {vendor.contactEmail && (
                <a href={`mailto:${vendor.contactEmail}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-violet-600 transition-colors">
                  <Mail size={10} /> {vendor.contactEmail}
                </a>
              )}
              {vendor.contactPhone && (
                <a href={`https://wa.me/${vendor.contactPhone.replace(/\D/g, '')}?text=Hi, I'm reaching out regarding our wedding`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-600 transition-colors">
                  <MessageCircle size={10} /> WhatsApp
                </a>
              )}
            </div>
          </div>
          {vendor.amount != null && (
            <div className="text-right flex-shrink-0 hidden sm:block">
              <p className="text-sm font-bold text-[#14161C]">{fmt(vendor.amount)}</p>
              {vendor.amount > vendor.paidAmount && <p className="text-xs text-red-400 mt-0.5">Owed: {fmt(vendor.amount - vendor.paidAmount)}</p>}
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={STATUS_BADGE[vendor.status] ?? 'default'}>{vendor.status}</Badge>
            <select value={vendor.status}
              onChange={e => updateStatus.mutate({ vendorId: vendor.id, status: e.target.value as LocalVendor['status'], currentVersion: vendor.version })}
              className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none cursor-pointer"
              disabled={updateStatus.isPending} aria-label="Update vendor status">
              <option value="ENQUIRED">Enquired</option>
              <option value="QUOTED">Quoted</option>
              <option value="BOOKED">Booked</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors" aria-label="Edit">
                <Pencil size={13} />
              </button>
              <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" aria-label="Delete">
                <Trash2 size={13} />
              </button>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'Collapse' : 'Expand notes'}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>
        {expanded && <VendorNotes vendorId={vendor.id} weddingId={weddingId} />}
        {expanded && <VendorEventAssign vendorId={vendor.id} weddingId={weddingId} />}
      </div>
      {editing && <EditVendorModal vendor={vendor} weddingId={weddingId} onClose={() => setEditing(false)} />}
    </>
  )
}

function AddVendorModal({ weddingId, onClose }: Readonly<{ weddingId: string; onClose: () => void }>) {
  const addVendor = useAddVendor(weddingId)
  const [form, setForm] = useState({
    name: '', category: 'CATERING', contactPhone: '', contactEmail: '',
    amount: '', description: '', isBackup: false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await addVendor.mutateAsync({
      weddingId, name: form.name.trim(), category: form.category, status: 'ENQUIRED',
      contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined,
      amount: form.amount ? parseFloat(form.amount) : undefined, paidAmount: 0,
    })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add vendor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="vendor-name">Vendor name *</Label>
          <Input id="vendor-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Catering" required />
        </div>
        <div>
          <Label htmlFor="vendor-desc">Description</Label>
          <Input id="vendor-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What they do, specialty, key terms…" />
        </div>
        <div>
          <Label htmlFor="vendor-cat">Category</Label>
          <Select id="vendor-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vendor-phone">Phone</Label>
            <Input id="vendor-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254..." />
          </div>
          <div>
            <Label htmlFor="vendor-amount">Amount (KES)</Label>
            <Input id="vendor-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" min="0" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input type="checkbox" checked={form.isBackup} onChange={e => setForm(f => ({ ...f, isBackup: e.target.checked }))} className="rounded" />
          Mark as backup vendor
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={addVendor.isPending}>
            {addVendor.isPending ? 'Adding…' : 'Add vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function VendorsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: vendors = [], isLoading } = useVendors(wid)
  const stats = useVendorStats(wid)
  const { vendorFilter, setVendorFilter } = useWeddingStore()
  const [showAdd, setShowAdd] = useState(false)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  const filtered = useMemo(() => vendors.filter(v => {
    if (vendorFilter.search && !v.name.toLowerCase().includes(vendorFilter.search.toLowerCase())) return false
    if (vendorFilter.category !== 'all' && v.category !== vendorFilter.category) return false
    if (vendorFilter.status !== 'all' && v.status !== vendorFilter.status) return false
    return true
  }), [vendors, vendorFilter])

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">People</p>
            <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Vendors</h1>
            <p className="text-sm text-zinc-400 mt-2">{stats.total} vendors · {fmt(stats.totalOwed)} outstanding</p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add vendor</Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
          {[
            { label: 'Confirmed', val: stats.confirmed, color: 'text-emerald-600' },
            { label: 'Booked', val: stats.booked, color: 'text-sky-600' },
            { label: 'Pending', val: stats.pending, color: 'text-amber-500' },
            { label: 'Total owed', val: fmt(stats.totalOwed), color: stats.totalOwed > 0 ? 'text-red-500' : 'text-[#14161C]' },
          ].map(({ label, val, color }, i) => (
            <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-extrabold leading-none ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input value={vendorFilter.search} onChange={e => setVendorFilter({ search: e.target.value })} placeholder="Search vendors…" className="pl-9" />
          </div>
          <Select value={vendorFilter.category} onChange={e => setVendorFilter({ category: e.target.value })} className="w-auto" aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select value={vendorFilter.status} onChange={e => setVendorFilter({ status: e.target.value })} className="w-auto" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="ENQUIRED">Enquired</option>
            <option value="QUOTED">Quoted</option>
            <option value="BOOKED">Booked</option>
            <option value="CONFIRMED">Confirmed</option>
          </Select>
          {(vendorFilter.search || vendorFilter.category !== 'all' || vendorFilter.status !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => setVendorFilter({ search: '', category: 'all', status: 'all' })}>
              <X size={13} /> Clear
            </Button>
          )}
        </div>

        {/* Vendor list */}
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-[#14161C]">{filtered.length} vendor{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={40} />}
              title="No vendors found"
              description={vendors.length === 0 ? 'Add your first vendor to get started' : 'Try adjusting your filters'}
              action={vendors.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus size={14} />Add vendor</Button> : undefined}
            />
          ) : (
            filtered.map(v => <VendorRow key={v.id} vendor={v} weddingId={wid} />)
          )}
        </div>
      </div>

      {showAdd && <AddVendorModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
