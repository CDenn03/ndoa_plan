'use client'
import { useState, useRef } from 'react'
import { Camera, Video, Plus, Pencil, Trash2, Check, X, Upload,
  CheckSquare, DollarSign, FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button, Input, Label, Select, Modal, Badge, EmptyState, Spinner, ProgressBar } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotographyVendor {
  id: string; name: string; category: 'PHOTOGRAPHY' | 'VIDEOGRAPHY'; status: string
  contactName?: string; contactPhone?: string; contactEmail?: string
  amount?: number; paidAmount: number; depositAmount?: number; depositPaidAt?: string
  contractPath?: string; notes?: string; description?: string
}

export interface PhotographyChecklistItem {
  id: string; title: string; description?: string; category?: string
  isChecked: boolean; priority: number; order: number
  dueDate?: string; assignedToName?: string; eventId?: string; isFinalCheck?: boolean
}

export interface PhotographyBudgetLine {
  id: string; description: string; estimated: number; actual: number
  vendorId?: string; vendorName?: string; notes?: string; eventId?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

const STATUS_BADGE: Record<string, 'confirmed' | 'declined' | 'pending' | 'maybe'> = {
  CONFIRMED: 'confirmed', BOOKED: 'confirmed', COMPLETED: 'confirmed',
  CANCELLED: 'declined', ENQUIRED: 'pending', QUOTED: 'maybe',
}

const CHECKLIST_TEMPLATES = {
  PRE_WEDDING: [
    'Confirm booking and contract signed',
    'Share shot list with photographer',
    'Scout ceremony and reception locations',
    'Confirm arrival time and schedule',
    'Discuss cultural moments to capture',
    'Confirm second shooter / videographer',
    'Check drone permit if applicable',
    'Share family formals list',
    'Confirm backup equipment available',
  ],
  DAY_OF: [
    'Photographer arrives on time',
    'Memory cards formatted and ready',
    'Battery packs charged',
    'Lighting equipment set up',
    'Confirm shot list on hand',
    'Coordinate with MC for key moments',
  ],
  POST_WEDDING: [
    'Sneak peek received',
    'Full gallery received',
    'Highlight video received',
    'Full film received',
    'Album ordered',
    'Album delivered',
    'Review left for photographer',
    'Thank you sent',
  ],
}

const SHOT_LIST_TEMPLATES = {
  GETTING_READY: ['Bride getting ready — detail shots (dress, shoes, rings)', 'Groom getting ready', 'Bridesmaids helping bride', 'Groomsmen with groom', 'First look (if planned)'],
  CEREMONY: ['Processional', 'Bride entrance', 'Exchange of vows', 'Ring exchange', 'First kiss', 'Recessional', 'Signing of register'],
  CULTURAL: ['Ruracio — dowry negotiation', 'Ruracio — handover ceremony', 'Traditional attire portraits', 'Elder blessings', 'Cultural dance moments'],
  PORTRAITS: ['Couple portraits — outdoor', 'Couple portraits — venue', 'Bridal party group', 'Groomsmen group', 'Bridesmaids group'],
  FAMILY: ['Bride with parents', 'Groom with parents', 'Both families together', 'Siblings', 'Extended family groups'],
  RECEPTION: ['Venue details — tables, decor, flowers', 'Cake cutting', 'First dance', 'Parent dances', 'Speeches', 'Bouquet toss', 'Guests dancing'],
  DETAILS: ['Wedding rings', 'Bouquet', 'Invitation suite', 'Venue exterior', 'Table settings', 'Cake detail'],
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

function VendorCard({ vendor, weddingId, onEdit }: Readonly<{
  vendor: PhotographyVendor; weddingId: string; onEdit: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const balance = (vendor.amount ?? 0) - vendor.paidAmount
  const pct = vendor.amount ? Math.round((vendor.paidAmount / vendor.amount) * 100) : 0

  const handleDelete = async () => {
    if (!confirm(`Remove ${vendor.name}?`)) return
    try {
      await fetch(`/api/weddings/${weddingId}/vendors/${vendor.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      await qc.invalidateQueries({ queryKey: ['vendors', weddingId] })
      toast('Vendor removed', 'success')
    } catch { toast('Failed to remove', 'error') }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#1F4D3A]/8 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${vendor.category === 'PHOTOGRAPHY' ? 'bg-[#1F4D3A]/6' : 'bg-sky-50'}`}>
              {vendor.category === 'PHOTOGRAPHY' ? <Camera size={18} className="text-[#1F4D3A]" /> : <Video size={18} className="text-sky-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-[#14161C]">{vendor.name}</p>
              <p className="text-xs text-[#14161C]/40">{vendor.category === 'PHOTOGRAPHY' ? 'Photographer' : 'Videographer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={STATUS_BADGE[vendor.status] ?? 'pending'}>{vendor.status}</Badge>
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Edit"><Pencil size={13} /></button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/40 hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
          </div>
        </div>

        {vendor.amount && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#14161C]/55">Package cost</span>
              <span className="font-bold text-[#14161C]">{fmt(vendor.amount)}</span>
            </div>
            <ProgressBar value={vendor.paidAmount} max={vendor.amount} />
            <div className="flex justify-between text-xs">
              <span className="text-[#14161C]/40">Paid: <span className="font-semibold text-emerald-600">{fmt(vendor.paidAmount)}</span></span>
              <span className="text-[#14161C]/40">Balance: <span className={`font-semibold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(balance)}</span></span>
            </div>
            {pct < 100 && <p className="text-xs text-[#14161C]/40">{pct}% paid</p>}
          </div>
        )}

        {vendor.description && (
          <p className="mt-3 text-xs text-[#14161C]/55 leading-relaxed">{vendor.description}</p>
        )}

        <button onClick={() => setExpanded(v => !v)} className="mt-3 flex items-center gap-1 text-xs text-[#14161C]/40 hover:text-[#14161C]/60 transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'Details'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#1F4D3A]/8 px-5 py-4 space-y-2 bg-[#F7F5F2]/50">
          {vendor.contactName && <p className="text-xs text-[#14161C]/55">Contact: <span className="font-medium text-[#14161C]/70">{vendor.contactName}</span></p>}
          {vendor.contactPhone && <p className="text-xs text-[#14161C]/55">Phone: <span className="font-medium text-[#14161C]/70">{vendor.contactPhone}</span></p>}
          {vendor.contactEmail && <p className="text-xs text-[#14161C]/55">Email: <span className="font-medium text-[#14161C]/70">{vendor.contactEmail}</span></p>}
          {vendor.depositAmount && <p className="text-xs text-[#14161C]/55">Deposit: <span className="font-medium text-[#14161C]/70">{fmt(vendor.depositAmount)}{vendor.depositPaidAt ? ` — paid ${format(new Date(vendor.depositPaidAt), 'MMM d, yyyy')}` : ' (unpaid)'}</span></p>}
          {vendor.contractPath && (
            <a href={`/api/storage/signed-url?path=${encodeURIComponent(vendor.contractPath)}&bucket=contracts`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#1F4D3A] hover:text-[#16382B] font-medium">
              <FileText size={12} /> View contract <ExternalLink size={10} />
            </a>
          )}
          {vendor.notes && <p className="text-xs text-[#14161C]/40 italic">{vendor.notes}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Vendor Modal ─────────────────────────────────────────────────────────────

function VendorModal({ weddingId, vendor, onClose }: Readonly<{
  weddingId: string; vendor?: PhotographyVendor; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    category: vendor?.category ?? 'PHOTOGRAPHY',
    status: vendor?.status ?? 'ENQUIRED',
    contactName: vendor?.contactName ?? '',
    contactPhone: vendor?.contactPhone ?? '',
    contactEmail: vendor?.contactEmail ?? '',
    amount: vendor?.amount ? String(vendor.amount) : '',
    depositAmount: vendor?.depositAmount ? String(vendor.depositAmount) : '',
    description: vendor?.description ?? '',
    notes: vendor?.notes ?? '',
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        name: form.name, category: form.category, status: form.status,
        contactName: form.contactName || null, contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        amount: form.amount ? Number.parseFloat(form.amount) : null,
        depositAmount: form.depositAmount ? Number.parseFloat(form.depositAmount) : null,
        description: form.description || null, notes: form.notes || null,
      }
      if (vendor) {
        await fetch(`/api/weddings/${weddingId}/vendors/${vendor.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        toast('Vendor updated', 'success')
      } else {
        await fetch(`/api/weddings/${weddingId}/vendors`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        toast('Vendor added', 'success')
      }
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      await qc.invalidateQueries({ queryKey: ['vendors', weddingId] })
      onClose()
    } catch { toast('Failed to save', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={vendor ? 'Edit vendor' : 'Add photographer / videographer'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="pv-name">Name *</Label>
            <Input id="pv-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Studio name" required /></div>
          <div><Label htmlFor="pv-cat">Type</Label>
            <Select id="pv-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="PHOTOGRAPHY">Photography</option>
              <option value="VIDEOGRAPHY">Videography</option>
            </Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="pv-status">Status</Label>
            <Select id="pv-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="ENQUIRED">Enquired</option>
              <option value="QUOTED">Quoted</option>
              <option value="BOOKED">Booked</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select></div>
          <div><Label htmlFor="pv-amount">Package cost (KES)</Label>
            <Input id="pv-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="150000" min="0" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="pv-contact">Contact name</Label>
            <Input id="pv-contact" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Jane Doe" /></div>
          <div><Label htmlFor="pv-phone">Phone</Label>
            <Input id="pv-phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="0712345678" /></div>
        </div>
        <div><Label htmlFor="pv-desc">Package description</Label>
          <Input id="pv-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. 8hrs coverage, 2 shooters, online gallery, 1 album" /></div>
        <div><Label htmlFor="pv-notes">Notes</Label>
          <Input id="pv-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" /></div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : vendor ? 'Save changes' : 'Add vendor'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Checklist Section ────────────────────────────────────────────────────────

function ChecklistSection({ items, weddingId, eventId, title, category, templateKey }: Readonly<{
  items: PhotographyChecklistItem[]; weddingId: string; eventId?: string
  title: string; category: string; templateKey?: keyof typeof CHECKLIST_TEMPLATES
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  const toggle = async (item: PhotographyChecklistItem) => {
    try {
      await fetch(`/api/weddings/${weddingId}/checklist/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked: !item.isChecked }),
      })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    } catch { toast('Failed to update', 'error') }
  }

  const addItem = async () => {
    if (!newTitle.trim()) return
    try {
      await fetch(`/api/weddings/${weddingId}/checklist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(), category, eventId: eventId ?? null,
          priority: 2, order: items.length, isChecked: false,
        }),
      })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      setNewTitle(''); setAdding(false)
      toast('Item added', 'success')
    } catch { toast('Failed to add', 'error') }
  }

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/checklist/${id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    } catch { toast('Failed to delete', 'error') }
  }

  const loadTemplate = async () => {
    if (!templateKey) return
    setLoadingTemplate(true)
    try {
      const templates = CHECKLIST_TEMPLATES[templateKey]
      for (let i = 0; i < templates.length; i++) {
        await fetch(`/api/weddings/${weddingId}/checklist`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: templates[i], category, eventId: eventId ?? null, priority: 2, order: items.length + i, isChecked: false }),
        })
      }
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      toast('Template loaded', 'success')
    } catch { toast('Failed to load template', 'error') }
    finally { setLoadingTemplate(false) }
  }

  const done = items.filter(i => i.isChecked).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">{title}</p>
          <span className="text-xs text-[#14161C]/40">{done}/{items.length}</span>
        </div>
        <div className="flex gap-1">
          {templateKey && (
            <button onClick={loadTemplate} disabled={loadingTemplate}
              className="text-xs text-[#1F4D3A]/70 hover:text-[#1F4D3A] font-medium px-2 py-1 rounded-lg hover:bg-[#1F4D3A]/6 transition-colors">
              {loadingTemplate ? 'Loading…' : 'Load template'}
            </button>
          )}
          <button onClick={() => setAdding(true)} className="p-1 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 hover:text-[#14161C]/60" aria-label="Add item">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-[#1F4D3A]/8 overflow-hidden">
          {items.map(item => (
            <div key={item.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-zinc-50 last:border-0">
              <button onClick={() => toggle(item)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.isChecked ? 'bg-[#1F4D3A]/60 border-violet-500' : 'border-zinc-300 hover:border-[#1F4D3A]/40'}`}
                aria-label={item.isChecked ? 'Uncheck' : 'Check'}>
                {item.isChecked && <Check size={10} className="text-white" />}
              </button>
              <p className={`flex-1 text-sm ${item.isChecked ? 'line-through text-[#14161C]/40' : 'text-[#14161C]/70'}`}>{item.title}</p>
              <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-[#14161C]/25 hover:text-red-400 transition-all" aria-label="Delete">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex items-center gap-2">
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Add item…" className="flex-1 h-8 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addItem() } if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            autoFocus />
          <button onClick={addItem} className="p-1.5 rounded-lg bg-[#1F4D3A]/6 text-[#1F4D3A] hover:bg-[#1F4D3A]/10" aria-label="Save"><Check size={13} /></button>
          <button onClick={() => { setAdding(false); setNewTitle('') }} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40" aria-label="Cancel"><X size={13} /></button>
        </div>
      )}

      {items.length === 0 && !adding && (
        <button onClick={() => setAdding(true)} className="w-full py-3 border border-dashed border-[#1F4D3A]/12 rounded-xl text-xs text-[#14161C]/40 hover:border-violet-300 hover:text-[#1F4D3A]/70 transition-colors">
          + Add item
        </button>
      )}
    </div>
  )
}

// ─── Shot List Section ────────────────────────────────────────────────────────

function ShotListSection({ items, weddingId, eventId }: Readonly<{
  items: PhotographyChecklistItem[]; weddingId: string; eventId?: string
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newGroup, setNewGroup] = useState('CEREMONY')
  const [loadingGroup, setLoadingGroup] = useState<string | null>(null)

  const groups = Object.keys(SHOT_LIST_TEMPLATES) as (keyof typeof SHOT_LIST_TEMPLATES)[]
  const done = items.filter(i => i.isChecked).length

  const toggle = async (item: PhotographyChecklistItem) => {
    try {
      await fetch(`/api/weddings/${weddingId}/checklist/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked: !item.isChecked }),
      })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    } catch { toast('Failed to update', 'error') }
  }

  const addShot = async () => {
    if (!newTitle.trim()) return
    try {
      await fetch(`/api/weddings/${weddingId}/checklist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(), category: 'SHOT_LIST',
          description: newGroup, eventId: eventId ?? null,
          priority: 2, order: items.length, isChecked: false,
        }),
      })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      setNewTitle(''); setAdding(false)
    } catch { toast('Failed to add shot', 'error') }
  }

  const deleteShot = async (id: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/checklist/${id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    } catch { toast('Failed to delete', 'error') }
  }

  const loadGroupTemplate = async (group: keyof typeof SHOT_LIST_TEMPLATES) => {
    setLoadingGroup(group)
    try {
      const shots = SHOT_LIST_TEMPLATES[group]
      for (let i = 0; i < shots.length; i++) {
        await fetch(`/api/weddings/${weddingId}/checklist`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: shots[i], category: 'SHOT_LIST', description: group, eventId: eventId ?? null, priority: 2, order: items.length + i, isChecked: false }),
        })
      }
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      toast(`${group.replace('_', ' ')} shots loaded`, 'success')
    } catch { toast('Failed to load', 'error') }
    finally { setLoadingGroup(null) }
  }

  // Group items by their description field (used as group label)
  const grouped = items.reduce<Record<string, PhotographyChecklistItem[]>>((acc, item) => {
    const g = item.description ?? 'OTHER'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Shot List</p>
          <span className="text-xs text-[#14161C]/40">{done}/{items.length} captured</span>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Add shot</Button>
      </div>

      {/* Template loader */}
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1F4D3A]/12 p-4 space-y-2">
          <p className="text-xs text-[#14161C]/40 font-medium">Load shot group templates:</p>
          <div className="flex flex-wrap gap-1.5">
            {groups.map(g => (
              <button key={g} onClick={() => loadGroupTemplate(g)} disabled={loadingGroup === g}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1F4D3A]/6 hover:bg-[#1F4D3A]/10 hover:text-[#1F4D3A] text-[#14161C]/60 transition-colors">
                {loadingGroup === g ? '…' : g.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped shot list */}
      {Object.entries(grouped).map(([group, shots]) => (
        <div key={group} className="space-y-1">
          <p className="text-[10px] font-bold text-[#14161C]/25 uppercase tracking-widest px-1">{group.replace('_', ' ')}</p>
          <div className="bg-white rounded-xl border border-[#1F4D3A]/8 overflow-hidden">
            {shots.map(shot => (
              <div key={shot.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-zinc-50 last:border-0">
                <button onClick={() => toggle(shot)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${shot.isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 hover:border-emerald-400'}`}
                  aria-label={shot.isChecked ? 'Uncheck' : 'Check'}>
                  {shot.isChecked && <Check size={10} className="text-white" />}
                </button>
                <p className={`flex-1 text-sm ${shot.isChecked ? 'line-through text-[#14161C]/40' : 'text-[#14161C]/70'}`}>{shot.title}</p>
                <button onClick={() => deleteShot(shot.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-[#14161C]/25 hover:text-red-400 transition-all" aria-label="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {adding && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
            className="text-xs border border-[#1F4D3A]/12 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
            {groups.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
          </select>
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Shot description…" className="flex-1 h-8 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addShot() } if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            autoFocus />
          <button onClick={addShot} className="p-1.5 rounded-lg bg-[#1F4D3A]/6 text-[#1F4D3A] hover:bg-[#1F4D3A]/10" aria-label="Save"><Check size={13} /></button>
          <button onClick={() => { setAdding(false); setNewTitle('') }} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40" aria-label="Cancel"><X size={13} /></button>
        </div>
      )}
    </div>
  )
}

// ─── Deliverables Section ─────────────────────────────────────────────────────

interface Deliverable { label: string; key: string; expectedKey: string; receivedKey: string }

const DELIVERABLES: Deliverable[] = [
  { label: 'Sneak peek', key: 'sneak_peek', expectedKey: 'sneak_peek_expected', receivedKey: 'sneak_peek_received' },
  { label: 'Full gallery', key: 'gallery', expectedKey: 'gallery_expected', receivedKey: 'gallery_received' },
  { label: 'Highlight video', key: 'highlight', expectedKey: 'highlight_expected', receivedKey: 'highlight_received' },
  { label: 'Full film', key: 'film', expectedKey: 'film_expected', receivedKey: 'film_received' },
  { label: 'Printed album', key: 'album', expectedKey: 'album_expected', receivedKey: 'album_received' },
]

function DeliverablesSection({ items, weddingId, eventId }: Readonly<{
  items: PhotographyChecklistItem[]; weddingId: string; eventId?: string
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()

  // Deliverables are stored as checklist items with category='PHOTOGRAPHY' and description=deliverable key
  const getItem = (key: string) => items.find(i => i.description === key)

  const toggle = async (item: PhotographyChecklistItem) => {
    try {
      await fetch(`/api/weddings/${weddingId}/checklist/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked: !item.isChecked }),
      })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    } catch { toast('Failed to update', 'error') }
  }

  const ensureItem = async (key: string, label: string) => {
    const existing = getItem(key)
    if (existing) return existing
    const res = await fetch(`/api/weddings/${weddingId}/checklist`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: label, category: 'PHOTOGRAPHY', description: key, eventId: eventId ?? null, priority: 2, order: 99, isChecked: false }),
    })
    await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    return res.json() as Promise<PhotographyChecklistItem>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Deliverables</p>
      <div className="bg-white rounded-xl border border-[#1F4D3A]/8 overflow-hidden">
        {DELIVERABLES.map(d => {
          const item = getItem(d.key)
          return (
            <div key={d.key} className="flex items-center gap-4 px-4 py-3 border-b border-zinc-50 last:border-0">
              <button
                onClick={async () => {
                  const it = item ?? await ensureItem(d.key, d.label)
                  if (it) await toggle(it)
                }}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item?.isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 hover:border-emerald-400'}`}
                aria-label={item?.isChecked ? 'Mark not received' : 'Mark received'}>
                {item?.isChecked && <Check size={10} className="text-white" />}
              </button>
              <p className={`flex-1 text-sm font-medium ${item?.isChecked ? 'text-[#14161C]/40 line-through' : 'text-[#14161C]/70'}`}>{d.label}</p>
              {item?.isChecked && <span className="text-xs text-emerald-600 font-semibold">Received</span>}
              {!item?.isChecked && <span className="text-xs text-[#14161C]/25">Pending</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Budget Section ───────────────────────────────────────────────────────────

function BudgetSection({ lines, weddingId, eventId, vendors }: Readonly<{
  lines: PhotographyBudgetLine[]; weddingId: string; eventId?: string; vendors: PhotographyVendor[]
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ description: '', estimated: '', actual: '', vendorId: '', notes: '' })

  const totalEstimated = lines.reduce((s, l) => s + l.estimated, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)

  const addLine = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch(`/api/weddings/${weddingId}/budget`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'PHOTOGRAPHY', description: form.description,
          estimated: Number.parseFloat(form.estimated) || 0,
          actual: Number.parseFloat(form.actual) || 0,
          vendorId: form.vendorId || null, notes: form.notes || null,
          eventId: eventId ?? null,
        }),
      })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
      setForm({ description: '', estimated: '', actual: '', vendorId: '', notes: '' })
      setAdding(false)
      toast('Budget line added', 'success')
    } catch { toast('Failed to add', 'error') }
  }

  const deleteLine = async (id: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/budget/${id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['photography', weddingId] })
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest">Budget</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Add line</Button>
      </div>

      {lines.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F7F5F2] rounded-xl p-3">
              <p className="text-xs text-[#14161C]/40">Estimated</p>
              <p className="text-lg font-extrabold text-sky-600">{fmt(totalEstimated)}</p>
            </div>
            <div className="bg-[#F7F5F2] rounded-xl p-3">
              <p className="text-xs text-[#14161C]/40">Actual</p>
              <p className={`text-lg font-extrabold ${totalActual > totalEstimated ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(totalActual)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#1F4D3A]/8 overflow-hidden">
            {lines.map(line => (
              <div key={line.id} className="group flex items-center gap-3 px-4 py-3 border-b border-zinc-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#14161C]/70">{line.description}</p>
                  {line.vendorName && <p className="text-xs text-[#14161C]/40">{line.vendorName}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#14161C]">{fmt(line.actual || line.estimated)}</p>
                  {line.actual > 0 && line.estimated > 0 && line.actual !== line.estimated && (
                    <p className="text-xs text-[#14161C]/40">est. {fmt(line.estimated)}</p>
                  )}
                </div>
                <button onClick={() => deleteLine(line.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-[#14161C]/25 hover:text-red-400 transition-all" aria-label="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {adding && (
        <form onSubmit={addLine} className="bg-[#F7F5F2] rounded-xl p-4 space-y-3">
          <div><Label htmlFor="pb-desc">Description *</Label>
            <Input id="pb-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Photography package" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pb-est">Estimated (KES)</Label>
              <Input id="pb-est" type="number" value={form.estimated} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} placeholder="0" min="0" /></div>
            <div><Label htmlFor="pb-act">Actual (KES)</Label>
              <Input id="pb-act" type="number" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} placeholder="0" min="0" /></div>
          </div>
          {vendors.length > 0 && (
            <div><Label htmlFor="pb-vendor">Vendor</Label>
              <Select id="pb-vendor" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                <option value="">No vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select></div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
            <Button type="submit" size="sm" className="flex-1">Add</Button>
          </div>
        </form>
      )}

      {lines.length === 0 && !adding && (
        <button onClick={() => setAdding(true)} className="w-full py-3 border border-dashed border-[#1F4D3A]/12 rounded-xl text-xs text-[#14161C]/40 hover:border-violet-300 hover:text-[#1F4D3A]/70 transition-colors">
          + Add budget line
        </button>
      )}
    </div>
  )
}

// ─── Main Photography Tab ─────────────────────────────────────────────────────

interface PhotographyData {
  vendors: PhotographyVendor[]
  checklistItems: PhotographyChecklistItem[]
  budgetLines: PhotographyBudgetLine[]
}

type PhotoTab = 'overview' | 'shotlist' | 'checklist' | 'deliverables' | 'budget'

export function PhotographyTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId?: string }>) {
  const [activeTab, setActiveTab] = useState<PhotoTab>('overview')
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<PhotographyVendor | null>(null)

  const { data, isLoading } = useQuery<PhotographyData>({
    queryKey: ['photography', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/photography`)
      if (!res.ok) throw new Error()
      return res.json()
    },
    staleTime: 30_000,
  })

  const vendors = data?.vendors ?? []
  const allItems = data?.checklistItems ?? []
  const budgetLines = data?.budgetLines ?? []

  // Filter by eventId if scoped
  const items = eventId ? allItems.filter(i => !i.eventId || i.eventId === eventId) : allItems
  const lines = eventId ? budgetLines.filter(l => !l.eventId || l.eventId === eventId) : budgetLines

  const checklistItems = items.filter(i => i.category === 'PHOTOGRAPHY')
  const shotListItems = items.filter(i => i.category === 'SHOT_LIST')
  const deliverableItems = checklistItems.filter(i => DELIVERABLES.some(d => d.key === i.description))
  const preItems = checklistItems.filter(i => !DELIVERABLES.some(d => d.key === i.description) && !i.isFinalCheck)

  const tabs: { key: PhotoTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Camera },
    { key: 'shotlist', label: 'Shot List', icon: CheckSquare },
    { key: 'checklist', label: 'Checklist', icon: CheckSquare },
    { key: 'deliverables', label: 'Deliverables', icon: FileText },
    { key: 'budget', label: 'Budget', icon: DollarSign },
  ]

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-[#1F4D3A]/8 -mx-1 px-1">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === key ? 'border-violet-500 text-[#1F4D3A]' : 'border-transparent text-[#14161C]/40 hover:text-[#14161C]/60'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#14161C]/55">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => setShowVendorModal(true)}><Plus size={13} /> Add vendor</Button>
          </div>
          {vendors.length === 0 ? (
            <EmptyState icon={<Camera size={40} className="text-[#14161C]/15" />} title="No photographers yet"
              description="Add your photographer or videographer to get started"
              action={<Button size="sm" onClick={() => setShowVendorModal(true)}><Plus size={13} /> Add vendor</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vendors.map(v => (
                <VendorCard key={v.id} vendor={v} weddingId={weddingId} onEdit={() => setEditingVendor(v)} />
              ))}
            </div>
          )}

          {/* Quick stats */}
          {(shotListItems.length > 0 || checklistItems.length > 0) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F7F5F2] rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-[#1F4D3A]">{shotListItems.filter(i => i.isChecked).length}/{shotListItems.length}</p>
                <p className="text-xs text-[#14161C]/40 mt-0.5">Shots captured</p>
              </div>
              <div className="bg-[#F7F5F2] rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-emerald-600">{preItems.filter(i => i.isChecked).length}/{preItems.length}</p>
                <p className="text-xs text-[#14161C]/40 mt-0.5">Checklist done</p>
              </div>
              <div className="bg-[#F7F5F2] rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-sky-600">{deliverableItems.filter(i => i.isChecked).length}/{DELIVERABLES.length}</p>
                <p className="text-xs text-[#14161C]/40 mt-0.5">Deliverables</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'shotlist' && (
        <ShotListSection items={shotListItems} weddingId={weddingId} eventId={eventId} />
      )}

      {activeTab === 'checklist' && (
        <div className="space-y-8">
          <ChecklistSection items={preItems.filter(i => !i.isFinalCheck)} weddingId={weddingId} eventId={eventId}
            title="Pre-wedding" category="PHOTOGRAPHY" templateKey="PRE_WEDDING" />
          <ChecklistSection items={preItems.filter(i => i.isFinalCheck)} weddingId={weddingId} eventId={eventId}
            title="Day-of" category="PHOTOGRAPHY" templateKey="DAY_OF" />
          <ChecklistSection items={checklistItems.filter(i => i.assignedToName === 'post')} weddingId={weddingId} eventId={eventId}
            title="Post-wedding" category="PHOTOGRAPHY" templateKey="POST_WEDDING" />
        </div>
      )}

      {activeTab === 'deliverables' && (
        <DeliverablesSection items={deliverableItems} weddingId={weddingId} eventId={eventId} />
      )}

      {activeTab === 'budget' && (
        <BudgetSection lines={lines} weddingId={weddingId} eventId={eventId} vendors={vendors} />
      )}

      {showVendorModal && <VendorModal weddingId={weddingId} onClose={() => setShowVendorModal(false)} />}
      {editingVendor && <VendorModal weddingId={weddingId} vendor={editingVendor} onClose={() => setEditingVendor(null)} />}
    </div>
  )
}
