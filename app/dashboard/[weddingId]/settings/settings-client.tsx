'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Upload, Image as ImageIcon } from 'lucide-react'
import { Button, Input, Select, Label } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

const CULTURAL_TYPES = ['STANDARD','KIKUYU','LUO','KAMBA','KALENJIN','COASTAL']

interface Props {
  weddingId: string
  initialValues: {
    name: string; date: string; venue: string; venueCapacity: number | string
    budget: number; culturalType: string; themeColor: string; themeAccent: string
    couplePhotoPath?: string
  }
}

export function WeddingSettingsClient({ weddingId, initialValues }: Readonly<Props>) {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'media')
      formData.append('path', `${weddingId}/couple-photo/${Date.now()}-${file.name}`)
      formData.append('weddingId', weddingId)

      const upRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
      if (!upRes.ok) throw new Error('Upload failed')
      const { path } = await upRes.json() as { path: string }

      // Save path to wedding
      await fetch(`/api/weddings/${weddingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couplePhotoPath: path }),
      })
      setForm(f => ({ ...f, couplePhotoPath: path }))
      toast('Photo uploaded', 'success')
      router.refresh()
    } catch {
      toast('Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          venueCapacity: form.venueCapacity ? parseInt(String(form.venueCapacity)) : null,
          budget: parseFloat(String(form.budget)) || 0,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast('Settings saved', 'success')
      router.refresh()
    } catch {
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Configuration</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Couple photo */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Couple photo</p>
            <div className="flex items-center gap-5">
              {form.couplePhotoPath ? (
                <img
                  src={`/api/storage/signed-url?path=${encodeURIComponent(form.couplePhotoPath)}&bucket=media`}
                  alt="Couple photo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#CDB5F7]/40"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center">
                  <ImageIcon size={24} className="text-zinc-300" />
                </div>
              )}
              <div>
                <Button type="button" variant="lavender" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload photo'}
                </Button>
                <p className="text-xs text-zinc-400 mt-1.5">Shown on the dashboard. JPG or PNG, max 5MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* Wedding details section */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Wedding details</p>
            <div className="space-y-5">
              <div>
                <Label htmlFor="s-name">Wedding name</Label>
                <Input id="s-name" value={form.name} onChange={set('name')} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="s-date">Date</Label>
                  <Input id="s-date" type="date" value={form.date} onChange={set('date')} required />
                </div>
                <div>
                  <Label htmlFor="s-cultural">Cultural type</Label>
                  <Select id="s-cultural" value={form.culturalType} onChange={set('culturalType')}>
                    {CULTURAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="s-venue">Venue</Label>
                <Input id="s-venue" value={form.venue} onChange={set('venue')} placeholder="e.g. Safari Park Hotel" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="s-capacity">Venue capacity</Label>
                  <Input id="s-capacity" type="number" value={form.venueCapacity} onChange={set('venueCapacity')} min="1" placeholder="300" />
                </div>
                <div>
                  <Label htmlFor="s-budget">Total budget (KES)</Label>
                  <Input id="s-budget" type="number" value={form.budget} onChange={set('budget')} min="0" placeholder="1500000" />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* Theme section */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Theme colours</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="s-theme">Primary colour</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input id="s-theme" type="color" value={form.themeColor} onChange={set('themeColor')}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-zinc-200 p-0.5" />
                  <span className="text-sm text-zinc-500 font-mono">{form.themeColor}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="s-accent">Accent colour</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input id="s-accent" type="color" value={form.themeAccent} onChange={set('themeAccent')}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-zinc-200 p-0.5" />
                  <span className="text-sm text-zinc-500 font-mono">{form.themeAccent}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

