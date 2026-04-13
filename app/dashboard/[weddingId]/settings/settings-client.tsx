'use client'
import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Upload, Image as ImageIcon, Plus, X, Search, Crosshair } from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

// ─── Colour library ───────────────────────────────────────────────────────────
const ALL_COLOURS = [
  { name: 'White',           hex: '#FFFFFF', group: 'Whites & Creams' },
  { name: 'Off White',       hex: '#FAF9F6', group: 'Whites & Creams' },
  { name: 'Ivory',           hex: '#FFFFF0', group: 'Whites & Creams' },
  { name: 'Cream',           hex: '#FFFDD0', group: 'Whites & Creams' },
  { name: 'Linen',           hex: '#FAF0E6', group: 'Whites & Creams' },
  { name: 'Pearl',           hex: '#EAE0C8', group: 'Whites & Creams' },
  { name: 'Champagne',       hex: '#F7E7CE', group: 'Whites & Creams' },
  { name: 'Vanilla',         hex: '#F3E5AB', group: 'Whites & Creams' },
  { name: 'Blush',           hex: '#FFB6C1', group: 'Pinks & Roses' },
  { name: 'Baby Pink',       hex: '#F4C2C2', group: 'Pinks & Roses' },
  { name: 'Dusty Rose',      hex: '#DCAE96', group: 'Pinks & Roses' },
  { name: 'Rose Gold',       hex: '#B76E79', group: 'Pinks & Roses' },
  { name: 'Mauve',           hex: '#E0B0B0', group: 'Pinks & Roses' },
  { name: 'Petal Pink',      hex: '#FF9999', group: 'Pinks & Roses' },
  { name: 'Hot Pink',        hex: '#FF69B4', group: 'Pinks & Roses' },
  { name: 'Fuchsia',         hex: '#FF00FF', group: 'Pinks & Roses' },
  { name: 'Deep Rose',       hex: '#C2185B', group: 'Pinks & Roses' },
  { name: 'Coral',           hex: '#FF7F50', group: 'Reds & Burgundy' },
  { name: 'Salmon',          hex: '#FA8072', group: 'Reds & Burgundy' },
  { name: 'Terracotta',      hex: '#E2725B', group: 'Reds & Burgundy' },
  { name: 'Brick Red',       hex: '#CB4154', group: 'Reds & Burgundy' },
  { name: 'Crimson',         hex: '#DC143C', group: 'Reds & Burgundy' },
  { name: 'Burgundy',        hex: '#800020', group: 'Reds & Burgundy' },
  { name: 'Wine',            hex: '#722F37', group: 'Reds & Burgundy' },
  { name: 'Maroon',          hex: '#800000', group: 'Reds & Burgundy' },
  { name: 'Peach',           hex: '#FFCBA4', group: 'Oranges & Peach' },
  { name: 'Apricot',         hex: '#FBCEB1', group: 'Oranges & Peach' },
  { name: 'Tangerine',       hex: '#F28500', group: 'Oranges & Peach' },
  { name: 'Burnt Orange',    hex: '#CC5500', group: 'Oranges & Peach' },
  { name: 'Amber',           hex: '#FFBF00', group: 'Oranges & Peach' },
  { name: 'Rust',            hex: '#B7410E', group: 'Oranges & Peach' },
  { name: 'Butter Yellow',   hex: '#FFFACD', group: 'Yellows & Golds' },
  { name: 'Lemon',           hex: '#FFF44F', group: 'Yellows & Golds' },
  { name: 'Sunflower',       hex: '#FFD700', group: 'Yellows & Golds' },
  { name: 'Gold',            hex: '#D4AF37', group: 'Yellows & Golds' },
  { name: 'Antique Gold',    hex: '#CFB53B', group: 'Yellows & Golds' },
  { name: 'Copper',          hex: '#B87333', group: 'Yellows & Golds' },
  { name: 'Bronze',          hex: '#CD7F32', group: 'Yellows & Golds' },
  { name: 'Mint',            hex: '#98FF98', group: 'Greens' },
  { name: 'Sage',            hex: '#B2C9AD', group: 'Greens' },
  { name: 'Sage Green',      hex: '#8A9A5B', group: 'Greens' },
  { name: 'Pistachio',       hex: '#93C572', group: 'Greens' },
  { name: 'Olive',           hex: '#808000', group: 'Greens' },
  { name: 'Emerald',         hex: '#50C878', group: 'Greens' },
  { name: 'Forest Green',    hex: '#228B22', group: 'Greens' },
  { name: 'Hunter Green',    hex: '#355E3B', group: 'Greens' },
  { name: 'Bottle Green',    hex: '#006A4E', group: 'Greens' },
  { name: 'Teal',            hex: '#008080', group: 'Greens' },
  { name: 'Baby Blue',       hex: '#89CFF0', group: 'Blues' },
  { name: 'Sky Blue',        hex: '#87CEEB', group: 'Blues' },
  { name: 'Powder Blue',     hex: '#B0E0E6', group: 'Blues' },
  { name: 'Cornflower Blue', hex: '#6495ED', group: 'Blues' },
  { name: 'Periwinkle',      hex: '#CCCCFF', group: 'Blues' },
  { name: 'Steel Blue',      hex: '#4682B4', group: 'Blues' },
  { name: 'Royal Blue',      hex: '#4169E1', group: 'Blues' },
  { name: 'Cobalt',          hex: '#0047AB', group: 'Blues' },
  { name: 'Navy Blue',       hex: '#1B2A4A', group: 'Blues' },
  { name: 'Midnight Blue',   hex: '#191970', group: 'Blues' },
  { name: 'Lavender',        hex: '#D4A94F', group: 'Purples & Lavender' },
  { name: 'Lilac',           hex: '#C8A2C8', group: 'Purples & Lavender' },
  { name: 'Wisteria',        hex: '#C9A0DC', group: 'Purples & Lavender' },
  { name: 'Orchid',          hex: '#DA70D6', group: 'Purples & Lavender' },
  { name: 'Violet',          hex: '#8B00FF', group: 'Purples & Lavender' },
  { name: 'Amethyst',        hex: '#9966CC', group: 'Purples & Lavender' },
  { name: 'Purple',          hex: '#800080', group: 'Purples & Lavender' },
  { name: 'Plum',            hex: '#8E4585', group: 'Purples & Lavender' },
  { name: 'Eggplant',        hex: '#614051', group: 'Purples & Lavender' },
  { name: 'Nude',            hex: '#E8C9A0', group: 'Neutrals & Browns' },
  { name: 'Sand',            hex: '#C2B280', group: 'Neutrals & Browns' },
  { name: 'Taupe',           hex: '#483C32', group: 'Neutrals & Browns' },
  { name: 'Mocha',           hex: '#967969', group: 'Neutrals & Browns' },
  { name: 'Caramel',         hex: '#C68642', group: 'Neutrals & Browns' },
  { name: 'Chocolate',       hex: '#7B3F00', group: 'Neutrals & Browns' },
  { name: 'Espresso',        hex: '#4A2C2A', group: 'Neutrals & Browns' },
  { name: 'Warm Grey',       hex: '#9E9E9E', group: 'Neutrals & Browns' },
  { name: 'Silver',          hex: '#C0C0C0', group: 'Neutrals & Browns' },
  { name: 'Charcoal',        hex: '#36454F', group: 'Neutrals & Browns' },
  { name: 'Slate',           hex: '#708090', group: 'Neutrals & Browns' },
  { name: 'Black',           hex: '#000000', group: 'Neutrals & Browns' },
]

interface PaletteEntry { name: string; hex: string }

interface Props {
  weddingId: string
  initialValues: {
    name: string; brideName: string; groomName: string
    couplePhotoPath?: string
    couplePhotoFocalX: number; couplePhotoFocalY: number
    palette: string[]
  }
}

function parsePalette(raw: string[]): PaletteEntry[] {
  return raw.map(s => { const [n, h] = s.split('|'); return { name: n ?? '', hex: h ?? '' } })
}
function encodePalette(entries: PaletteEntry[]): string[] {
  return entries.filter(e => e.hex).map(e => `${e.name}|${e.hex}`)
}
const DEFAULT_PALETTE: PaletteEntry[] = [
  { name: 'Lavender', hex: '#D4A94F' },
  { name: 'Champagne', hex: '#F7E7CE' },
  { name: 'Ivory', hex: '#FFFFF0' },
]

// ─── Colour Picker Modal (full-screen on mobile, sheet on desktop) ────────────

function ColourPickerModal({ current, onSelect, onClose }: Readonly<{
  current: string; onSelect: (p: PaletteEntry) => void; onClose: () => void
}>) {
  const [search, setSearch] = useState('')
  const [customHex, setCustomHex] = useState('')
  const [customName, setCustomName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? ALL_COLOURS.filter(c => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)) : ALL_COLOURS
  }, [search])

  const groups = useMemo(() => {
    const map = new Map<string, typeof ALL_COLOURS>()
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    }
    return map
  }, [filtered])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1F4D3A]/8 flex-shrink-0">
          <p className="text-sm font-bold text-[#14161C]">Choose a colour</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1F4D3A]/6 text-[#14161C]/40 transition-colors" aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#1F4D3A]/8 flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14161C]/40 pointer-events-none" />
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search colours…"
              className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent" />
          </div>
        </div>

        {/* Colour grid — scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
          {groups.size === 0 ? (
            <p className="text-sm text-[#14161C]/40 text-center py-8">No colours found for "{search}"</p>
          ) : Array.from(groups.entries()).map(([group, colours]) => (
            <div key={group}>
              <p className="text-[10px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2.5">{group}</p>
              <div className="grid grid-cols-5 gap-2">
                {colours.map(c => (
                  <button key={c.hex + c.name} type="button" onClick={() => { onSelect(c); onClose() }}
                    className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl active:scale-95 transition-all ${current === c.hex ? 'ring-2 ring-[#1F4D3A]/40 ring-offset-1 bg-[#1F4D3A]/6' : 'hover:bg-[#F7F5F2]'}`}>
                    <div className="w-10 h-10 rounded-xl border border-[#1F4D3A]/12 shadow-sm"
                      style={{ backgroundColor: c.hex }} />
                    <span className="text-[9px] text-[#14161C]/55 text-center leading-tight w-full truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom colour */}
        <div className="border-t border-[#1F4D3A]/8 px-4 py-3 flex-shrink-0 space-y-2">
          <p className="text-[10px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">Custom colour</p>
          <div className="flex items-center gap-2">
            <input type="color" value={customHex || '#1F4D3A'}
              onChange={e => { setCustomHex(e.target.value); if (!customName) setCustomName('Custom') }}
              className="w-10 h-10 rounded-xl border border-[#1F4D3A]/12 cursor-pointer flex-shrink-0 p-0.5" />
            <input value={customName} onChange={e => setCustomName(e.target.value)}
              placeholder="Name this colour…"
              className="flex-1 h-10 px-3 text-sm rounded-xl border border-[#1F4D3A]/12 focus:outline-none focus:ring-2 focus:ring-[#1F4D3A]/40 focus:border-transparent" />
            <Button type="button" size="sm" variant="lavender"
              onClick={() => { if (customHex && customName.trim()) { onSelect({ name: customName.trim(), hex: customHex }); onClose() } }}
              disabled={!customHex || !customName.trim()}>
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Colour Slot ──────────────────────────────────────────────────────────────

function ColourSlot({ entry, onChange, onRemove, canRemove }: Readonly<{
  entry: PaletteEntry; onChange: (e: PaletteEntry) => void
  onRemove: () => void; canRemove: boolean
}>) {
  const [open, setOpen] = useState(false)
  const isEmpty = !entry.hex

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-[#1F4D3A]/8 bg-white hover:border-[#1F4D3A]/12 transition-colors">
        <button type="button" onClick={() => setOpen(true)}
          className={`w-12 h-12 rounded-xl flex-shrink-0 border shadow-sm transition-transform hover:scale-105 active:scale-95 flex items-center justify-center ${isEmpty ? 'border-dashed border-zinc-300 bg-[#F7F5F2]' : 'border-[#1F4D3A]/12'}`}
          style={isEmpty ? {} : { backgroundColor: entry.hex }}
          aria-label="Pick colour">
          {isEmpty && <span className="text-[10px] text-[#14161C]/40 font-medium">Pick</span>}
        </button>
        <div className="flex-1 min-w-0">
          {isEmpty
            ? <p className="text-sm text-[#14161C]/40">No colour selected — tap to pick</p>
            : <>
                <p className="text-sm font-semibold text-[#14161C]">{entry.name}</p>
                <p className="text-xs text-[#14161C]/40 font-mono">{entry.hex}</p>
              </>
          }
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="p-1.5 rounded-lg text-[#14161C]/25 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
            aria-label="Remove colour">
            <X size={13} />
          </button>
        )}
      </div>
      {open && (
        <ColourPickerModal current={entry.hex}
          onSelect={p => { onChange(p); setOpen(false) }}
          onClose={() => setOpen(false)} />
      )}
    </>
  )
}

// ─── Focal Point Editor ───────────────────────────────────────────────────────

function FocalPointEditor({ src, focalX, focalY, onSave, onClose }: Readonly<{
  src: string; focalX: number; focalY: number
  onSave: (x: number, y: number) => void; onClose: () => void
}>) {
  const [x, setX] = useState(focalX)
  const [y, setY] = useState(focalY)

  const handlePointer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.type === 'mousemove' && e.buttons !== 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    setX(Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100))))
    setY(Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100))))
  }

  return (
    <Modal onClose={onClose} title="Set focal point">
      <div className="space-y-4">
        <p className="text-xs text-[#14161C]/40">Click or drag on the image to set where it focuses when cropped.</p>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          {/* Click target */}
          <div className="relative rounded-xl overflow-hidden cursor-crosshair select-none aspect-[4/3] bg-[#1F4D3A]/6"
            onClick={handlePointer} onMouseMove={handlePointer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Set focal point" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            {/* Crosshair */}
            <div className="absolute pointer-events-none" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>
              <div className="w-5 h-5 rounded-full border-2 border-white shadow-md bg-[#1F4D3A]/60/60 flex items-center justify-center">
                <Crosshair size={10} className="text-white" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-px w-[9999px] h-px bg-white/40" />
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-px h-[9999px] w-px bg-white/40" />
            </div>
          </div>

          {/* Live preview */}
          <div className="w-24 flex flex-col gap-1.5">
            <p className="text-[10px] text-[#1F4D3A]/40 uppercase tracking-widest">Preview</p>
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#1F4D3A]/6 border border-[#1F4D3A]/12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Preview" className="w-full h-full object-cover"
                style={{ objectPosition: `${x}% ${y}%` }} />
            </div>
            <p className="text-[10px] text-[#14161C]/40 font-mono text-center">{x}% {y}%</p>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="button" onClick={() => { onSave(x, y); onClose() }} className="flex-1">Apply</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function WeddingSettingsClient({ weddingId, initialValues }: Readonly<Props>) {
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState(initialValues.name)
  const [brideName, setBrideName] = useState(initialValues.brideName)
  const [groomName, setGroomName] = useState(initialValues.groomName)
  const [couplePhotoPath, setCouplePhotoPath] = useState(initialValues.couplePhotoPath)
  const [focalX, setFocalX] = useState(initialValues.couplePhotoFocalX)
  const [focalY, setFocalY] = useState(initialValues.couplePhotoFocalY)
  const [showFocalEditor, setShowFocalEditor] = useState(false)
  const [palette, setPalette] = useState<PaletteEntry[]>(
    initialValues.palette.length > 0 ? parsePalette(initialValues.palette) : DEFAULT_PALETTE
  )
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoUrl = couplePhotoPath
    ? `/api/storage/signed-url?path=${encodeURIComponent(couplePhotoPath)}&bucket=media`
    : null

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('bucket', 'media')
      fd.append('path', `${weddingId}/couple-photo/${Date.now()}-${file.name}`)
      fd.append('weddingId', weddingId)
      const up = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error('Upload failed')
      const { path } = await up.json() as { path: string }
      await fetch(`/api/weddings/${weddingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couplePhotoPath: path, couplePhotoFocalX: 50, couplePhotoFocalY: 50 }),
      })
      setCouplePhotoPath(path); setFocalX(50); setFocalY(50)
      toast('Photo uploaded', 'success')
      router.refresh()
    } catch { toast('Upload failed', 'error') }
    finally { setUploading(false) }
  }

  const handleFocalSave = async (x: number, y: number) => {
    setFocalX(x); setFocalY(y)
    await fetch(`/api/weddings/${weddingId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couplePhotoFocalX: x, couplePhotoFocalY: y }),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, brideName: brideName || null, groomName: groomName || null, palette: encodePalette(palette) }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast('Settings saved', 'success'); router.refresh()
    } catch { toast('Failed to save settings', 'error') }
    finally { setSaving(false) }
  }

  const updateSlot = (i: number) => (entry: PaletteEntry) =>
    setPalette(p => p.map((e, idx) => idx === i ? entry : e))

  return (
    <>
      {showFocalEditor && photoUrl && (
        <FocalPointEditor src={photoUrl} focalX={focalX} focalY={focalY}
          onSave={handleFocalSave} onClose={() => setShowFocalEditor(false)} />
      )}

      <div className="min-h-full">
        <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Configuration</p>
            <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Settings</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-8 py-10">
          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Couple photo */}
            <div>
              <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-6">Couple photo</p>
              <div className="flex items-start gap-6">
                {/* Rectangular photo with focal point */}
                <div className="relative flex-shrink-0 w-48 h-36 rounded-2xl overflow-hidden bg-[#1F4D3A]/6 border border-[#1F4D3A]/12">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Couple"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${focalX}% ${focalY}%` }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-[#14161C]/25" />
                    </div>
                  )}
                  {photoUrl && (
                    <button type="button" onClick={() => setShowFocalEditor(true)}
                      className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 transition-colors"
                      aria-label="Adjust focal point">
                      <Crosshair size={13} />
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <Button type="button" variant="lavender" size="sm"
                    onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload photo'}
                  </Button>
                  {photoUrl && (
                    <button type="button" onClick={() => setShowFocalEditor(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#14161C]/55 hover:text-[#1F4D3A] transition-colors">
                      <Crosshair size={12} /> Adjust focal point
                    </button>
                  )}
                  <p className="text-xs text-[#14161C]/40">JPG or PNG, max 5MB.</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>

            <hr className="border-[#1F4D3A]/8" />

            {/* Couple info */}
            <div>
              <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-6">Couple information</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="s-name" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-1.5">Wedding name</label>
                  <Input id="s-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wanjiku & Brian" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="s-bride" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-1.5">Bride's name</label>
                    <Input id="s-bride" value={brideName} onChange={e => setBrideName(e.target.value)} placeholder="e.g. Wanjiku" />
                  </div>
                  <div>
                    <label htmlFor="s-groom" className="block text-xs font-semibold text-[#14161C]/55 uppercase tracking-wide mb-1.5">Groom's name</label>
                    <Input id="s-groom" value={groomName} onChange={e => setGroomName(e.target.value)} placeholder="e.g. Brian" />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-[#1F4D3A]/8" />

            {/* Colour palette */}
            <div>
              <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Wedding colours</p>
              <p className="text-xs text-[#14161C]/40 mb-4">Pick colours by name — these set the mood for your whole wedding.</p>

              {palette.some(e => e.hex) && (
                <div className="flex gap-1 mb-5 rounded-2xl overflow-hidden h-10 border border-[#1F4D3A]/8">
                  {palette.filter(e => e.hex).map((e, i) => (
                    <div key={e.hex + i} className="flex-1 h-full" style={{ backgroundColor: e.hex }} title={e.name} />
                  ))}
                </div>
              )}

              <div className="space-y-2.5">
                {palette.map((entry, i) => (
                  <ColourSlot key={`slot-${i}`} entry={entry}
                    onChange={updateSlot(i)}
                    onRemove={() => setPalette(p => p.filter((_, idx) => idx !== i))}
                    canRemove={palette.length > 1}
                  />
                ))}
              </div>

              {addingNew && (
                <ColourPickerModal current=""
                  onSelect={p => { setPalette(prev => [...prev, p]); setAddingNew(false) }}
                  onClose={() => setAddingNew(false)} />
              )}

              {palette.length < 6 && !addingNew && (
                <button type="button" onClick={() => setAddingNew(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">
                  <Plus size={13} /> Add another colour
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
