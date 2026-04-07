'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Save } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, CardContent, CardTitle } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

const CULTURAL_TYPES = ['STANDARD','KIKUYU','LUO','KAMBA','KALENJIN','COASTAL']

interface Props {
  weddingId: string
  initialValues: {
    name: string; date: string; venue: string; venueCapacity: number | string
    budget: number; culturalType: string; themeColor: string; themeAccent: string
  }
}

export function WeddingSettingsClient({ weddingId, initialValues }: Props) {
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-zinc-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Wedding details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Wedding name</label>
              <Input value={form.name} onChange={set('name')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
                <Input type="date" value={form.date} onChange={set('date')} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cultural type</label>
                <Select value={form.culturalType} onChange={set('culturalType')}>
                  {CULTURAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Venue</label>
              <Input value={form.venue} onChange={set('venue')} placeholder="e.g. Safari Park Hotel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Venue capacity</label>
                <Input type="number" value={form.venueCapacity} onChange={set('venueCapacity')} min="1" placeholder="300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Total budget (KES)</label>
                <Input type="number" value={form.budget} onChange={set('budget')} min="0" placeholder="1500000" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Primary colour</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.themeColor} onChange={set('themeColor')} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                  <span className="text-sm text-zinc-500 font-mono">{form.themeColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Accent colour</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.themeAccent} onChange={set('themeAccent')} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                  <span className="text-sm text-zinc-500 font-mono">{form.themeAccent}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save size={15} />
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}
