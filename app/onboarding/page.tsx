'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

const CULTURAL_TYPES = ['STANDARD', 'KIKUYU', 'LUO', 'KAMBA', 'KALENJIN', 'COASTAL']
const CULTURAL_LABELS: Record<string, string> = {
  STANDARD: 'Standard', KIKUYU: 'Kikuyu', LUO: 'Luo',
  KAMBA: 'Kamba', KALENJIN: 'Kalenjin', COASTAL: 'Coastal',
}

const STEPS = ['Basics', 'Style & Guests', 'Review']

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    date: '',
    venue: '',
    venueCapacity: '',
    budget: '',
    culturalType: 'STANDARD',
    expectedGuestCount: '',
    themeColor: '#8B5CF6',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const canNext = () => {
    if (step === 0) return form.name.trim() !== '' && form.date !== ''
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          venueCapacity: form.venueCapacity ? parseInt(form.venueCapacity) : null,
          budget: parseFloat(form.budget) || 0,
          expectedGuestCount: form.expectedGuestCount ? parseInt(form.expectedGuestCount) : null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create wedding')
      const { id } = await res.json()
      router.push(`/dashboard/${id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create wedding. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 mb-3">
            <Heart size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Set up your wedding</h1>
          <p className="text-zinc-400 mt-2 text-sm">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                i < step ? 'bg-violet-600 text-white' : i === step ? 'bg-violet-600 text-white ring-2 ring-violet-400/40' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-violet-600' : 'bg-zinc-700'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Step 0: Basics */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Wedding name *</label>
                <Input value={form.name} onChange={set('name')} placeholder="John & Jane's Wedding" required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Wedding date *</label>
                <Input type="date" value={form.date} onChange={set('date')} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Venue</label>
                <Input value={form.venue} onChange={set('venue')} placeholder="e.g. Safari Park Hotel, Nairobi" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Venue capacity</label>
                  <Input type="number" value={form.venueCapacity} onChange={set('venueCapacity')} placeholder="300" min="1" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Total budget (KES)</label>
                  <Input type="number" value={form.budget} onChange={set('budget')} placeholder="500000" min="0" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Style & Guests */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Cultural type</label>
                <Select value={form.culturalType} onChange={set('culturalType')} className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  {CULTURAL_TYPES.map(t => <option key={t} value={t}>{CULTURAL_LABELS[t]}</option>)}
                </Select>
                {form.culturalType !== 'STANDARD' && (
                  <p className="text-xs text-violet-400 mt-1.5">
                    Cultural-specific tasks and templates will be suggested for your checklist.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Expected guest count</label>
                <Input type="number" value={form.expectedGuestCount} onChange={set('expectedGuestCount')} placeholder="250" min="1" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                <p className="text-xs text-zinc-500 mt-1.5">Used for catering estimates and logistics planning.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Theme colour</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.themeColor} onChange={set('themeColor')} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                  <span className="text-zinc-400 text-sm font-mono">{form.themeColor}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-zinc-300 mb-4">Review your details</p>
              {[
                { label: 'Wedding name', value: form.name },
                { label: 'Date', value: form.date },
                { label: 'Venue', value: form.venue || '—' },
                { label: 'Budget', value: form.budget ? `KES ${parseInt(form.budget).toLocaleString()}` : '—' },
                { label: 'Cultural type', value: CULTURAL_LABELS[form.culturalType] },
                { label: 'Expected guests', value: form.expectedGuestCount || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-zinc-800 pb-3 last:border-0">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-zinc-200 font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                <ChevronLeft size={15} /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex-1">
                Next <ChevronRight size={15} />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : 'Create wedding →'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
