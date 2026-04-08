'use client'
import { useState, useMemo, use } from 'react';
import { ShoppingBag, Search, Plus, Phone, Mail, X } from 'lucide-react'
import { Button, Input, Select, Badge, Card, CardHeader, CardContent, CardTitle, StatCard, EmptyState, Spinner } from '@/components/ui'
import { useVendors, useVendorStats, useAddVendor, useUpdateVendorStatus } from '@/hooks/use-vendors'
import { useWeddingStore } from '@/store/wedding-store'
import type { LocalVendor } from '@/types'

const STATUS_BADGE: Record<string, 'confirmed' | 'pending' | 'maybe' | 'declined'> = {
  CONFIRMED: 'confirmed', BOOKED: 'maybe', ENQUIRED: 'pending', QUOTED: 'pending', CANCELLED: 'declined', COMPLETED: 'confirmed',
}

const CATEGORIES = ['CATERING','PHOTOGRAPHY','VIDEOGRAPHY','FLORIST','MUSIC_DJ','BAND','TRANSPORT','DECOR','CAKE','ATTIRE','VENUE','OFFICIANT','HAIR_MAKEUP','ENTERTAINMENT','SECURITY','OTHER']

function VendorCard({ vendor, weddingId }: { vendor: LocalVendor; weddingId: string }) {
  const updateStatus = useUpdateVendorStatus(weddingId)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{vendor.name}</p>
            {vendor.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Pending sync" />}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{vendor.category.replace('_', ' ')}</p>
        </div>
        <select
          value={vendor.status}
          onChange={e => updateStatus.mutate({ vendorId: vendor.id, status: e.target.value as LocalVendor['status'], currentVersion: vendor.version })}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          disabled={updateStatus.isPending}
        >
          <option value="ENQUIRED">Enquired</option>
          <option value="QUOTED">Quoted</option>
          <option value="BOOKED">Booked</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {(vendor.contactPhone || vendor.contactEmail) && (
        <div className="flex gap-3 mb-3">
          {vendor.contactPhone && (
            <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-600">
              <Phone size={11} /> {vendor.contactPhone}
            </a>
          )}
          {vendor.contactEmail && (
            <a href={`mailto:${vendor.contactEmail}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-600">
              <Mail size={11} /> {vendor.contactEmail}
            </a>
          )}
        </div>
      )}

      {vendor.amount && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-400">Total</span>
          <div className="flex gap-3 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">{fmt(vendor.amount)}</span>
            <span className="text-green-500">Paid: {fmt(vendor.paidAmount)}</span>
            {vendor.amount > vendor.paidAmount && (
              <span className="text-red-400">Owed: {fmt(vendor.amount - vendor.paidAmount)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AddVendorModal({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
  const addVendor = useAddVendor(weddingId)
  const [form, setForm] = useState({ name: '', category: 'CATERING', contactPhone: '', contactEmail: '', amount: '' })

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Add vendor</h2>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Vendor name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Catering" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
              <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+254..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Amount (KES)</label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" min="0" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={addVendor.isPending}>
              {addVendor.isPending ? 'Adding...' : 'Add vendor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VendorsPage(props: { params: Promise<{ weddingId: string }> }) {
  const params = use(props.params);
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Vendors</h1>
          <p className="text-sm text-zinc-500">{stats.total} vendors · {fmt(stats.totalOwed)} outstanding</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={15} /> Add vendor</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Confirmed" value={stats.confirmed} color="green" />
        <StatCard label="Booked" value={stats.booked} color="blue" />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="Total owed" value={fmt(stats.totalOwed)} color={stats.totalOwed > 0 ? 'amber' : 'green'} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={vendorFilter.search} onChange={e => setVendorFilter({ search: e.target.value })} placeholder="Search vendors..." className="pl-8" />
        </div>
        <Select value={vendorFilter.category} onChange={e => setVendorFilter({ category: e.target.value })} className="w-auto">
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </Select>
        <Select value={vendorFilter.status} onChange={e => setVendorFilter({ status: e.target.value })} className="w-auto">
          <option value="all">All statuses</option>
          <option value="ENQUIRED">Enquired</option>
          <option value="QUOTED">Quoted</option>
          <option value="BOOKED">Booked</option>
          <option value="CONFIRMED">Confirmed</option>
        </Select>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
        : filtered.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={40} />} title="No vendors found"
            description={vendors.length === 0 ? 'Add your first vendor' : 'Try adjusting filters'}
            action={vendors.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus size={15} />Add vendor</Button> : undefined} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(v => <VendorCard key={v.id} vendor={v} weddingId={wid} />)}
          </div>
        )}

      {showAdd && <AddVendorModal weddingId={wid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
