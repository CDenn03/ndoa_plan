'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Button, Input, Select, Label } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

const CULTURAL_TYPES = ['STANDARD','KIKUYU','LUO','KAMBA','KALENJIN','COASTAL']

interface Props {
  weddingId: string
  initialValues: {
    name: string; date: string; venue: string; venueCapacity: number | string
    budget: number; culturalType: string; themeColor: string; themeAccent: string
  }
}

export function WeddingSettingsClient({ weddingId, initialValues }: Readonly<Props>) {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState(initialValues)
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

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

          {/* Wedding details section */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Wedding details</p>
            <div className="space-y-5">
              <div>
                <Label>Wedding name</Label>
                <Input value={form.name} onChange={set('name')} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={set('date')} required />
                </div>
                <div>
                  <Label>Cultural type</Label>
                  <Select value={form.culturalType} onChange={set('culturalType')}>
                    {CULTURAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Venue</Label>
                <Input value={form.venue} onChange={set('venue')} placeholder="e.g. Safari Park Hotel" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Venue capacity</Label>
                  <Input type="number" value={form.venueCapacity} onChange={set('venueCapacity')} min="1" placeholder="300" />
                </div>
                <div>
                  <Label>Total budget (KES)</Label>
                  <Input type="number" value={form.budget} onChange={set('budget')} min="0" placeholder="1500000" />
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
                <Label>Primary colour</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={form.themeColor} onChange={set('themeColor')}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-zinc-200 p-0.5" />
                  <span className="text-sm text-zinc-500 font-mono">{form.themeColor}</span>
                </div>
              </div>
              <div>
                <Label>Accent colour</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={form.themeAccent} onChange={set('themeAccent')}
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
