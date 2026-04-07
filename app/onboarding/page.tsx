'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'

const CULTURAL_TYPES = ['STANDARD', 'KIKUYU', 'LUO', 'KAMBA', 'KALENJIN', 'COASTAL']

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    date: '',
    venue: '',
    venueCapacity: '',
    budget: '',
    culturalType: 'STANDARD',
    themeColor: '#8B5CF6',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          venueCapacity: form.venueCapacity ? parseInt(form.venueCapacity) : null,
          budget: parseFloat(form.budget) || 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to create wedding')
      const { id } = await res.json()
      router.push(`/dashboard/${id}`)
    } catch (err) {
      alert('Failed to create wedding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 mb-3">
            <Heart size={20} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Set up your wedding</h1>
          <p className="text-zinc-400 mt-2 text-sm">Let's get started with the basics</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Wedding name *</label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John & Jane's Wedding"
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Wedding date *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Cultural type</label>
                <Select
                  value={form.culturalType}
                  onChange={e => setForm(f => ({ ...f, culturalType: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                >
                  {CULTURAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Venue</label>
              <Input
                value={form.venue}
                onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                placeholder="e.g. Safari Park Hotel, Nairobi"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Guest capacity</label>
                <Input
                  type="number"
                  value={form.venueCapacity}
                  onChange={e => setForm(f => ({ ...f, venueCapacity: e.target.value }))}
                  placeholder="300"
                  min="1"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Total budget (KES)</label>
                <Input
                  type="number"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="500000"
                  min="0"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Theme colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.themeColor}
                  onChange={e => setForm(f => ({ ...f, themeColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                />
                <span className="text-zinc-400 text-sm">{form.themeColor}</span>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create wedding →'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
