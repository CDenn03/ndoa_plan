'use client'
import { useMemo } from 'react'
import {
  TrendingUp, Wallet, Users, CheckCircle2, AlertTriangle, BarChart2,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { cn } from '@/components/ui'

const COLORS = [
  '#1F4D3A', '#D4A94F', '#10B981', '#F59E0B',
  '#3B82F6', '#EC4899', '#6366F1', '#14B8A6',
]

interface Props {
  weddingId: string
  eventId: string
  eventName: string
  totalBudget: number
  totalActual: number
  budgetByCategory: { name: string; estimated: number; actual: number; total: number }[]
  guestStats: { confirmed: number; pending: number; declined: number; total: number }
  vendorStats: { confirmed: number; booked: number; total: number }
  checklistStats: { checked: number; total: number }
  costPerGuest: number
  payments: { amount: number; createdAt: string }[]
}

function getBudgetColor(pct: number) {
  if (pct > 100) return 'text-red-500'
  if (pct > 85) return 'text-amber-500'
  return 'text-[#14161C]'
}

function StatCard({ label, value, sub, color = 'text-[#14161C]' }: Readonly<{
  label: string; value: string; sub?: string; color?: string
}>) {
  return (
    <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-1">
      <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">{label}</p>
      <p className={cn('text-3xl font-extrabold font-heading leading-none', color)}>{value}</p>
      {sub && <p className="text-xs text-[#14161C]/40 pt-0.5">{sub}</p>}
    </div>
  )
}

export function EventAnalyticsClient({
  weddingId, eventId, eventName, totalBudget, totalActual,
  budgetByCategory, guestStats, vendorStats, checklistStats, costPerGuest, payments,
}: Readonly<Props>) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  const budgetPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0
  const checklistPct = checklistStats.total > 0 ? Math.round((checklistStats.checked / checklistStats.total) * 100) : 0
  const guestConfirmPct = guestStats.total > 0 ? Math.round((guestStats.confirmed / guestStats.total) * 100) : 0
  const remaining = totalBudget - totalActual

  const trendData = useMemo(() => {
    const byWeek = payments.reduce<Record<string, number>>((acc, p) => {
      const week = format(new Date(p.createdAt), 'MMM d')
      acc[week] = (acc[week] ?? 0) + p.amount
      return acc
    }, {})
    return Object.entries(byWeek).map(([week, amount]) => ({ week, amount }))
  }, [payments])

  const cumulativeData = useMemo(() => {
    let running = 0
    return trendData.map(d => {
      running += d.amount
      return { week: d.week, cumulative: running }
    })
  }, [trendData])

  const pieData = budgetByCategory.slice(0, 8).map(c => ({
    name: c.name.replaceAll('_', ' '),
    value: c.total,
  }))

  const barData = budgetByCategory.slice(0, 8).map(c => ({
    name: c.name.replaceAll('_', ' ').slice(0, 12),
    estimated: c.estimated,
    actual: c.actual,
  }))

  // Suppress unused variable warnings for weddingId/eventId used in links
  void weddingId
  void eventId

  return (
    <div className="min-h-full">
      <div className="px-6 pt-8 pb-7 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Insights</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#14161C] leading-tight tracking-tight font-heading">
              Analytics
            </h1>
            <p className="text-sm text-[#14161C]/40 mt-1">{eventName}</p>
          </div>
          <BarChart2 size={28} className="text-[#1F4D3A]/20" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Budget used"
            value={`${budgetPct}%`}
            sub={`${fmt(totalActual)} of ${fmt(totalBudget)}`}
            color={getBudgetColor(budgetPct)}
          />
          <StatCard
            label="Guests confirmed"
            value={String(guestStats.confirmed)}
            sub={`${guestConfirmPct}% of ${guestStats.total} total`}
            color="text-emerald-600"
          />
          <StatCard
            label="Cost per guest"
            value={fmt(costPerGuest)}
            sub="based on confirmed guests"
            color="text-sky-600"
          />
          <StatCard
            label="Tasks done"
            value={`${checklistPct}%`}
            sub={`${checklistStats.checked} of ${checklistStats.total} items`}
            color="text-[#1F4D3A]"
          />
        </div>

        {/* Budget overview */}
        <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Wallet size={11} className="text-[#1F4D3A]/50" />
            <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Budget overview</p>
          </div>
          <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100">
            <div className="pr-6">
              <p className={cn('text-2xl font-extrabold font-heading', getBudgetColor(budgetPct))}>{budgetPct}%</p>
              <p className="text-xs text-[#14161C]/40 mt-0.5">used</p>
            </div>
            <div className="px-6">
              <p className="text-2xl font-extrabold text-amber-500 font-heading">{fmt(totalActual)}</p>
              <p className="text-xs text-[#14161C]/40 mt-0.5">committed</p>
            </div>
            <div className="pl-6">
              <p className={cn('text-2xl font-extrabold font-heading', remaining < 0 ? 'text-red-500' : 'text-emerald-600')}>
                {fmt(Math.abs(remaining))}
              </p>
              <p className="text-xs text-[#14161C]/40 mt-0.5">{remaining < 0 ? 'over budget' : 'remaining'}</p>
            </div>
          </div>
          {budgetPct > 100 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-3 py-1.5 w-fit">
              <AlertTriangle size={11} /> Over budget by {fmt(Math.abs(remaining))}
            </div>
          )}
        </div>

        {/* Charts */}
        {pieData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
              <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Spend by category</p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 min-w-0">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-[#14161C]/55 flex-1 truncate">{d.name}</span>
                      <span className="text-xs font-semibold text-[#14161C]">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
              <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Estimated vs actual</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="estimated" fill="#1F4D3A" opacity={0.25} radius={[3, 3, 0, 0]} name="Estimated" />
                  <Bar dataKey="actual" fill="#D4A94F" radius={[3, 3, 0, 0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Spending trend */}
        {trendData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
              <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Payments over time</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={trendData}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="amount" fill="#D4A94F" radius={[4, 4, 0, 0]} name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
              <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Cumulative spend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F4D3A10" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="cumulative" stroke="#1F4D3A" strokeWidth={2} dot={false} name="Cumulative" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Guests + Vendors + Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={11} /> Guest RSVP
            </p>
            <div className="space-y-3">
              {[
                { label: 'Confirmed', count: guestStats.confirmed, color: 'bg-emerald-400' },
                { label: 'Pending', count: guestStats.pending, color: 'bg-amber-300' },
                { label: 'Declined', count: guestStats.declined, color: 'bg-red-300' },
              ].map(({ label, count, color }) => {
                const pct = guestStats.total > 0 ? Math.round((count / guestStats.total) * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#14161C]/55">{label}</span>
                      <span className="font-bold text-[#14161C]">{count} <span className="text-[#14161C]/40 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
                      <div className={cn('h-1.5 rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={11} /> Vendors
            </p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-extrabold text-sky-600 leading-none font-heading">{vendorStats.confirmed}</p>
              <p className="text-sm text-[#14161C]/40 mb-0.5">of {vendorStats.total} confirmed</p>
            </div>
            <div className="space-y-2 pt-1">
              {[
                { label: 'Confirmed', count: vendorStats.confirmed, color: 'text-emerald-600' },
                { label: 'Booked', count: vendorStats.booked, color: 'text-sky-600' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-[#14161C]/55">{label}</span>
                  <span className={cn('font-bold', color)}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 size={11} /> Checklist
            </p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-extrabold text-[#1F4D3A] leading-none font-heading">{checklistPct}%</p>
              <p className="text-sm text-[#14161C]/40 mb-0.5">complete</p>
            </div>
            <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-[#1F4D3A] transition-all duration-700" style={{ width: `${checklistPct}%` }} />
            </div>
            <div className="pt-1 border-t border-[#1F4D3A]/8 flex justify-between text-xs">
              <span className="text-[#14161C]/40">{checklistStats.checked} done</span>
              <span className="text-[#14161C]/40">{checklistStats.total - checklistStats.checked} remaining</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
