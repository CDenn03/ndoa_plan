'use client'
import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, Pencil, Users, ChevronDown, ChevronRight, Shirt } from 'lucide-react'
import { Button, Input, Textarea, Select, Label, Modal, EmptyState, Badge, Spinner, ConfirmDialog } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BridalRole =
  | 'BRIDE' | 'GROOM' | 'BEST_MAN' | 'MAID_OF_HONOUR' | 'BRIDESMAID' | 'GROOMSMAN'
  | 'FLOWER_GIRL' | 'PAGE_BOY' | 'RING_BEARER' | 'PARENT_BRIDE' | 'PARENT_GROOM'
  | 'NEGOTIATOR' | 'ELDER' | 'OTHER'

export type BridalSide = 'BRIDE' | 'GROOM' | 'BOTH'
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED'

export interface BridalTeamMember {
  id: string; eventId: string; name: string; role: BridalRole; side: BridalSide
  phone?: string; email?: string; confirmationStatus: ConfirmationStatus; notes?: string
}

export interface BridalRoleOutfit {
  id: string; eventId: string; role: BridalRole; title: string; description?: string
}

interface OutfitImage {
  id: string; path: string; bucket: string; title?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<BridalRole, string> = {
  BRIDE: 'Bride', GROOM: 'Groom', BEST_MAN: 'Best Man', MAID_OF_HONOUR: 'Maid of Honour',
  BRIDESMAID: 'Bridesmaid', GROOMSMAN: 'Groomsman', FLOWER_GIRL: 'Flower Girl',
  PAGE_BOY: 'Page Boy', RING_BEARER: 'Ring Bearer', PARENT_BRIDE: "Bride's Parent",
  PARENT_GROOM: "Groom's Parent", NEGOTIATOR: 'Negotiator', ELDER: 'Elder', OTHER: 'Other',
}

const DEFAULT_OUTFIT_TITLES: Partial<Record<BridalRole, string>> = {
  BRIDE: 'Bridal Gown', GROOM: 'Groom Suit', BEST_MAN: 'Best Man Outfit',
  MAID_OF_HONOUR: 'Maid of Honour Outfit', BRIDESMAID: 'Bridesmaids Outfit',
  GROOMSMAN: 'Groomsmen Outfit', FLOWER_GIRL: 'Flower Girls Outfit',
  PAGE_BOY: 'Page Boys Outfit', RING_BEARER: 'Ring Bearer Outfit',
  PARENT_BRIDE: "Bride's Parents Outfit", PARENT_GROOM: "Groom's Parents Outfit",
  NEGOTIATOR: 'Negotiators Outfit', ELDER: 'Elders Outfit', OTHER: 'Outfit',
}

// Role groupings
const ROLE_GROUPS: { label: string; roles: BridalRole[] }[] = [
  { label: 'Couple', roles: ['BRIDE', 'GROOM'] },
  { label: 'Wedding Party', roles: ['BEST_MAN', 'MAID_OF_HONOUR', 'BRIDESMAID', 'GROOMSMAN'] },
  { label: 'Children', roles: ['FLOWER_GIRL', 'PAGE_BOY', 'RING_BEARER'] },
  { label: 'Traditional', roles: ['NEGOTIATOR', 'ELDER', 'PARENT_BRIDE', 'PARENT_GROOM'] },
  { label: 'Other', roles: ['OTHER'] },
]

const ALL_ROLES = Object.keys(ROLE_LABELS) as BridalRole[]

const SIDE_LABELS: Record<BridalSide, string> = { BRIDE: 'Bride side', GROOM: 'Groom side', BOTH: 'Both sides' }

const STATUS_VARIANT: Record<ConfirmationStatus, 'confirmed' | 'declined' | 'pending'> = {
  CONFIRMED: 'confirmed', DECLINED: 'declined', PENDING: 'pending',
}

// ─── Add / Edit Member Modal ──────────────────────────────────────────────────

function MemberModal({ weddingId, eventId, member, defaultRole, onClose }: Readonly<{
  weddingId: string; eventId: string; member?: BridalTeamMember; defaultRole?: BridalRole; onClose: () => void
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: member?.name ?? '',
    role: member?.role ?? defaultRole ?? 'BRIDESMAID' as BridalRole,
    side: member?.side ?? 'BRIDE' as BridalSide,
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    confirmationStatus: member?.confirmationStatus ?? 'PENDING' as ConfirmationStatus,
    notes: member?.notes ?? '',
  })

  const set = <K extends keyof typeof form>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = member
        ? `/api/weddings/${weddingId}/events/${eventId}/bridal-team/${member.id}`
        : `/api/weddings/${weddingId}/events/${eventId}/bridal-team`
      const res = await fetch(url, {
        method: member ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: form.phone || null, email: form.email || null, notes: form.notes || null }),
      })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['bridal-team', eventId] })
      toast(member ? 'Member updated' : 'Member added', 'success')
      onClose()
    } catch { toast('Failed to save member', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} title={member ? 'Edit member' : 'Add member'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bt-name">Name *</Label>
          <Input id="bt-name" value={form.name} onChange={set('name')} placeholder="e.g. Wanjiku Mwangi" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bt-role">Role *</Label>
            <Select id="bt-role" value={form.role} onChange={set('role')}>
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="bt-side">Side *</Label>
            <Select id="bt-side" value={form.side} onChange={set('side')}>
              {(Object.keys(SIDE_LABELS) as BridalSide[]).map(s => (
                <option key={s} value={s}>{SIDE_LABELS[s]}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bt-phone">Phone</Label>
            <Input id="bt-phone" value={form.phone} onChange={set('phone')} placeholder="+254 7xx xxx xxx" />
          </div>
          <div>
            <Label htmlFor="bt-email">Email</Label>
            <Input id="bt-email" type="email" value={form.email} onChange={set('email')} placeholder="optional" />
          </div>
        </div>
        <div>
          <Label htmlFor="bt-status">Confirmation</Label>
          <Select id="bt-status" value={form.confirmationStatus} onChange={set('confirmationStatus')}>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DECLINED">Declined</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="bt-notes">Notes</Label>
          <Textarea id="bt-notes" value={form.notes} onChange={set('notes')} placeholder="Any additional notes…" rows={2} />
        </div>
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : member ? 'Save changes' : 'Add member'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Outfit Image Grid ────────────────────────────────────────────────────────

function OutfitImageGrid({ weddingId, eventId, outfit }: Readonly<{
  weddingId: string; eventId: string; outfit: BridalRoleOutfit
}>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: images = [], isLoading } = useQuery<OutfitImage[]>({
    queryKey: ['outfit-images', outfit.id],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/media?linkedToType=bridal_role_outfit&linkedToId=${outfit.id}`)
      if (!res.ok) return []
      const all = await res.json() as { id: string; path: string; bucket: string; title?: string; linkedToId?: string; linkedToType?: string }[]
      return all.filter(i => i.linkedToType === 'bridal_role_outfit' && i.linkedToId === outfit.id)
    },
    staleTime: 30_000,
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('bucket', 'media')
        fd.append('path', `${weddingId}/bridal-team/${outfit.id}/${Date.now()}-${file.name}`)
        fd.append('weddingId', weddingId)
        const upRes = await fetch('/api/storage/upload', { method: 'POST', body: fd })
        if (!upRes.ok) continue
        const { path } = await upRes.json() as { path: string }
        await fetch(`/api/weddings/${weddingId}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'media', path, mimeType: file.type,
            linkedToType: 'bridal_role_outfit', linkedToId: outfit.id,
            title: file.name, eventId,
          }),
        })
      }
      await qc.invalidateQueries({ queryKey: ['outfit-images', outfit.id] })
      toast('Images uploaded', 'success')
    } catch { toast('Upload failed', 'error') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleDelete = async (imgId: string) => {
    try {
      await fetch(`/api/weddings/${weddingId}/media/${imgId}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['outfit-images', outfit.id] })
      toast('Image removed', 'success')
    } catch { toast('Failed to remove image', 'error') }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Outfit images</p>
        <Button size="sm" variant="lavender" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner size="sm" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-[#1F4D3A]/15 rounded-xl py-6 text-xs text-[#14161C]/35 hover:border-[#1F4D3A]/30 hover:text-[#14161C]/50 transition-colors flex flex-col items-center gap-1.5"
        >
          <Upload size={16} className="opacity-40" />
          Upload outfit images
        </button>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map(img => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-[#1F4D3A]/6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`}
                alt={img.title ?? 'Outfit image'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button
                type="button"
                onClick={() => void handleDelete(img.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/40 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Remove image"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Outfit Section (collapsible, collapsed by default) ──────────────────────

function OutfitSection({ weddingId, eventId, role, outfit, onSaved, defaultOpen = false }: Readonly<{
  weddingId: string; eventId: string; role: BridalRole
  outfit?: BridalRoleOutfit; onSaved: () => void; defaultOpen?: boolean
}>) {
  const { toast } = useToast()
  const [open, setOpen] = useState(defaultOpen)
  const [localOutfit, setLocalOutfit] = useState<BridalRoleOutfit | undefined>(outfit)
  const [title, setTitle] = useState(outfit?.title ?? DEFAULT_OUTFIT_TITLES[role] ?? 'Outfit')
  const [description, setDescription] = useState(outfit?.description ?? '')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (outfit && outfit.id !== localOutfit?.id) {
    setLocalOutfit(outfit); setTitle(outfit.title); setDescription(outfit.description ?? '')
  }

  const persist = async (t: string, d: string) => {
    try {
      if (localOutfit) {
        await fetch(`/api/weddings/${weddingId}/events/${eventId}/role-outfits/${localOutfit.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t || DEFAULT_OUTFIT_TITLES[role], description: d || null }),
        })
      } else {
        const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/role-outfits`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, title: t || DEFAULT_OUTFIT_TITLES[role], description: d || null }),
        })
        if (res.ok) { const created = await res.json() as BridalRoleOutfit; setLocalOutfit(created); onSaved() }
      }
    } catch { /* silent auto-save */ }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/role-outfits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, title: DEFAULT_OUTFIT_TITLES[role] ?? 'Outfit', description: null }),
      })
      if (!res.ok) throw new Error('Failed')
      const created = await res.json() as BridalRoleOutfit
      setLocalOutfit(created); setTitle(created.title); setOpen(true); onSaved()
    } catch { toast('Failed to create outfit', 'error') }
    finally { setCreating(false) }
  }

  const handleDelete = async () => {
    if (!localOutfit) return
    try {
      await fetch(`/api/weddings/${weddingId}/events/${eventId}/role-outfits/${localOutfit.id}`, { method: 'DELETE' })
      setLocalOutfit(undefined); setTitle(DEFAULT_OUTFIT_TITLES[role] ?? 'Outfit'); setDescription('')
      setOpen(false); toast('Outfit removed', 'success'); onSaved()
    } catch { toast('Failed to remove outfit', 'error') }
    finally { setConfirmDelete(false) }
  }

  // No outfit yet — show a simple "Add outfit" link
  if (!localOutfit) {
    return (
      <button type="button" onClick={handleCreate} disabled={creating}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors disabled:opacity-50">
        <Plus size={13} /> {creating ? 'Creating…' : 'Add outfit'}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-[#1F4D3A]/10 overflow-hidden">
      {/* Collapsible header */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F5F2] hover:bg-[#1F4D3A]/6 transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Shirt size={13} className="text-[#1F4D3A]/50" />
          <span className="text-xs font-bold text-[#1F4D3A]/60 uppercase tracking-widest">Outfit</span>
          {localOutfit.title && (
            <span className="text-xs text-[#14161C]/50 font-medium">— {localOutfit.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
            className="p-1 rounded-lg hover:bg-red-50 text-[#14161C]/25 hover:text-red-500 transition-colors" aria-label="Remove outfit">
            <Trash2 size={11} />
          </button>
          {open ? <ChevronDown size={13} className="text-[#14161C]/30" /> : <ChevronRight size={13} className="text-[#14161C]/30" />}
        </div>
      </div>

      {/* Collapsible body */}
      {open && (
        <div className="p-4 space-y-4 bg-white">
          <div>
            <Label htmlFor={`outfit-title-${role}`}>Title</Label>
            <Input id={`outfit-title-${role}`} value={title} onChange={e => setTitle(e.target.value)}
              onBlur={() => void persist(title, description)}
              placeholder={DEFAULT_OUTFIT_TITLES[role] ?? 'Outfit title'} />
          </div>
          <div>
            <Label htmlFor={`outfit-desc-${role}`}>
              Description <span className="normal-case font-normal text-[#14161C]/30">(optional)</span>
            </Label>
            <Textarea id={`outfit-desc-${role}`} value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => void persist(title, description)}
              placeholder="Fabric, colour, style, accessories, measurements…"
              className="min-h-[80px]" />
          </div>
          <OutfitImageGrid weddingId={weddingId} eventId={eventId} outfit={localOutfit} />
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog title="Remove outfit?"
          description="This will also remove all outfit images. Members in this role are not affected."
          confirmLabel="Remove"
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)} />
      )}
    </div>
  )
}

// ─── Role Block ───────────────────────────────────────────────────────────────

function RoleBlock({ weddingId, eventId, role, members, outfit, outfitDefaultOpen = false, onAddMember, onEditMember, onDeleteMember, onOutfitSaved }: Readonly<{
  weddingId: string; eventId: string; role: BridalRole
  members: BridalTeamMember[]; outfit?: BridalRoleOutfit; outfitDefaultOpen?: boolean
  onAddMember: (role: BridalRole) => void
  onEditMember: (m: BridalTeamMember) => void
  onDeleteMember: (m: BridalTeamMember) => void
  onOutfitSaved: () => void
}>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#14161C]">{ROLE_LABELS[role]}</h3>
        <Button size="sm" variant="ghost" onClick={() => onAddMember(role)}>
          <Plus size={12} /> Add
        </Button>
      </div>

      {/* Members list */}
      {members.length > 0 && (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 bg-white rounded-xl border border-[#1F4D3A]/8">
              <div className="w-8 h-8 rounded-full bg-[#1F4D3A]/8 flex items-center justify-center text-xs font-bold text-[#1F4D3A] flex-shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#14161C] truncate">{m.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-[#14161C]/40">{SIDE_LABELS[m.side]}</span>
                  <Badge variant={STATUS_VARIANT[m.confirmationStatus]} className="text-[10px] py-0">
                    {m.confirmationStatus.charAt(0) + m.confirmationStatus.slice(1).toLowerCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => onEditMember(m)}
                  className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/8 text-[#14161C]/30 hover:text-[#1F4D3A] transition-colors" aria-label="Edit">
                  <Pencil size={12} />
                </button>
                <button type="button" onClick={() => onDeleteMember(m)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-[#14161C]/30 hover:text-red-500 transition-colors" aria-label="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outfit section — collapsed by default in Team tab */}
      <OutfitSection
        weddingId={weddingId} eventId={eventId}
        role={role} outfit={outfit} onSaved={onOutfitSaved}
        defaultOpen={outfitDefaultOpen}
      />
    </div>
  )
}

// ─── Main Tab Component ───────────────────────────────────────────────────────

type BridalTab = 'team' | 'outfits'

export function BridalTeamTab({ weddingId, eventId }: Readonly<{ weddingId: string; eventId: string }>) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<BridalTab>('team')
  const [addingRole, setAddingRole] = useState<BridalRole | null>(null)
  const [editingMember, setEditingMember] = useState<BridalTeamMember | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<BridalTeamMember | null>(null)

  const { data: members = [], isLoading: loadingMembers } = useQuery<BridalTeamMember[]>({
    queryKey: ['bridal-team', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/bridal-team`)
      if (!res.ok) throw new Error('Failed to load bridal team')
      return res.json() as Promise<BridalTeamMember[]>
    },
    staleTime: 30_000,
  })

  const { data: outfits = [], isLoading: loadingOutfits } = useQuery<BridalRoleOutfit[]>({
    queryKey: ['role-outfits', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/role-outfits`)
      if (!res.ok) throw new Error('Failed to load outfits')
      return res.json() as Promise<BridalRoleOutfit[]>
    },
    staleTime: 30_000,
  })

  const handleDeleteMember = async (member: BridalTeamMember) => {
    try {
      await fetch(`/api/weddings/${weddingId}/events/${eventId}/bridal-team/${member.id}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['bridal-team', eventId] })
      toast('Member removed', 'success')
    } catch { toast('Failed to remove member', 'error') }
    finally { setConfirmDelete(null) }
  }

  const refreshOutfits = () => void qc.invalidateQueries({ queryKey: ['role-outfits', eventId] })

  if (loadingMembers || loadingOutfits) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const rolesWithData = new Set<BridalRole>([
    ...members.map(m => m.role),
    ...outfits.map(o => o.role),
  ])
  const outfitByRole = new Map(outfits.map(o => [o.role, o]))
  const isEmpty = rolesWithData.size === 0

  const TABS: { key: BridalTab; label: string;  }[] = [
    { key: 'team',    label: 'Team' },
    { key: 'outfits', label: 'Outfits'},
  ]

  return (
    <div className="space-y-4">
      {/* Sub-tabs — pill style */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
                activeTab === t.key
                  ? 'bg-white text-[#14161C] shadow-sm border border-[#1F4D3A]/10'
                  : 'bg-transparent text-[#14161C]/40 hover:text-[#14161C]/60 hover:bg-white/50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Add member button aligned right */}
        <Button size="sm" onClick={() => setAddingRole('BRIDESMAID')}>
          <Plus size={13} /> Add member
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No bridal team yet"
          description="Add members and define role-based outfits for this event."
          action={<Button onClick={() => setAddingRole('BRIDESMAID')}><Plus size={14} /> Add member</Button>}
        />
      ) : (
        <>
          {/* ── Team tab: members + outfit collapsed per role ── */}
          {activeTab === 'team' && (
            <div className="space-y-8">
              {ROLE_GROUPS.map(group => {
                const groupRoles = group.roles.filter(r => rolesWithData.has(r))
                if (groupRoles.length === 0) return null
                return (
                  <div key={group.label}>
                    <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-4">{group.label}</p>
                    <div className="space-y-6">
                      {groupRoles.map(role => (
                        <RoleBlock key={role}
                          weddingId={weddingId} eventId={eventId} role={role}
                          members={members.filter(m => m.role === role)}
                          outfit={outfitByRole.get(role)}
                          outfitDefaultOpen={false}
                          onAddMember={r => setAddingRole(r)}
                          onEditMember={m => setEditingMember(m)}
                          onDeleteMember={m => setConfirmDelete(m)}
                          onOutfitSaved={refreshOutfits}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Outfits tab: outfit expanded, no member list ── */}
          {activeTab === 'outfits' && (
            <div className="space-y-8">
              {ROLE_GROUPS.map(group => {
                const groupRoles = group.roles.filter(r => rolesWithData.has(r))
                if (groupRoles.length === 0) return null
                return (
                  <div key={group.label}>
                    <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-4">{group.label}</p>
                    <div className="space-y-4">
                      {groupRoles.map(role => (
                        <div key={role}>
                          <p className="text-sm font-semibold text-[#14161C] mb-2">{ROLE_LABELS[role]}</p>
                          <OutfitSection
                            weddingId={weddingId} eventId={eventId}
                            role={role} outfit={outfitByRole.get(role)}
                            onSaved={refreshOutfits}
                            defaultOpen={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {addingRole && (
        <MemberModal weddingId={weddingId} eventId={eventId}
          defaultRole={addingRole} onClose={() => setAddingRole(null)} />
      )}
      {editingMember && (
        <MemberModal weddingId={weddingId} eventId={eventId}
          member={editingMember} onClose={() => setEditingMember(null)} />
      )}
      {confirmDelete && (
        <ConfirmDialog title={`Remove ${confirmDelete.name}?`}
          description="This member will be removed from the bridal team."
          confirmLabel="Remove"
          onConfirm={() => void handleDeleteMember(confirmDelete)}
          onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  )
}
