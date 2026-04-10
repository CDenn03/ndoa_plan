'use client'
import { BarChart2 } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#8B5CF6', '#CDB5F7', '#E5DF98', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#6366F1', '#14B8A6', '#F97316']

interface Props {
  currency: string
  totalBudget: number
  totalSpent: number
  totalActual: number
  budgetByCategory: { name: string; estimated: number; actual: number; total: number }[]
  guestStats: { confirmed: number; pending: number; declined: number; total: number }
  vendorStats: { confirmed: number; booked: number; total: number }
  checklistStats: { checked: number; total: number }
  costPerGuest: number
  payments: { amount: number; createdAt: string }[]
}

export function AnalyticsClient({
  currency, totalBudget, totalSpent, totalActual,
  budgetByCategory, guestStats, vendorStats, checklistStats, costPerGuest, payments,
}: Readonly<Props>) {
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  const budgetPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0
  const checklistPct = checklistStats.total > 0 ? Math.round((checklistStats.checked / checklistStats.total) * 100) : 0

  // Spending trend by week
  const spendByWeek = payments.reduce<Record<string, number>>((acc, p) => {
    const week = format(new Date(p.createdAt), 'MMM d')
    acc[week] = (acc[week] ?? 0) + p.amount
    return acc
  }, {})
  const trendData = Object.entries(spendByWeek).map(([week, amount]) => ({ week, amount }))

  const pieData = budgetByCategory.slice(0, 8).map(c => ({ name: c.name.replace(/_/g, ' '), value: c.total }))

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Insights</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Analytics</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-12">

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
          {[
            { label: 'Budget used', val: `${budgetPct}%`, color: budgetPct > 100 ? 'text-red-500' : budgetPct > 85 ? 'text-amber-500' : 'text-[#14161C]' },
            { label: 'Guests confirmed', val: String(guestStats.confirmed), color: 'text-emerald-600' },
            { label: 'Cost per guest', val: fmt(costPerGuest), color: 'text-sky-600' },
            { label: 'Tasks done', val: `${checklistPct}%`, color: 'text-violet-600' },
          ].map(({ label, val, color }, i) => (
            <div key={label} className={i === 0 ? 'pr-8' : i === 3 ? 'pl-8' : 'px-8'}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-extrabold leading-none ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        <hr className="border-zinc-100" />

        {/* Budget doughnut + guest bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Budget by category</p>
            {pieData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-zinc-500 flex-1 truncate">{d.name}</span>
                      <span className="text-xs font-semibold text-[#14161C]">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No budget data yet</p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Guest RSVP</p>
            <div className="space-y-4">
              {[
                { label: 'Confirmed', count: guestStats.confirmed, color: 'bg-emerald-400' },
                { label: 'Pending', count: guestStats.pending, color: 'bg-amber-300' },
                { label: 'Declined', count: guestStats.declined, color: 'bg-red-300' },
              ].map(({ label, count, color }) => {
                const pct = guestStats.total > 0 ? Math.round((count / guestStats.total) * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-zinc-500 font-medium">{label}</span>
                      <span className="font-bold text-[#14161C]">{count} <span className="text-zinc-400 font-normal text-xs">({pct}%)</span></span>
                    </div>
                    <div className="bg-zinc-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Vendor status</p>
              <div className="space-y-2">
                {[
                  { label: 'Confirmed', count: vendorStats.confirmed, color: 'text-emerald-600' },
                  { label: 'Booked', count: vendorStats.booked, color: 'text-sky-600' },
                  { label: 'Other', count: vendorStats.total - vendorStats.confirmed - vendorStats.booked, color: 'text-zinc-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className={`font-bold ${color}`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Spending trend */}
        {trendData.length > 0 && (
          <>
            <hr className="border-zinc-100" />
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Spending over time</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="amount" fill="#CDB5F7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Budget table */}
        <hr className="border-zinc-100" />
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">Budget breakdown</p>
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            <div className="grid grid-cols-4 px-6 py-3 border-b border-zinc-100 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              <span>Category</span>
              <span className="text-right">Estimated</span>
              <span className="text-right">Spent</span>
              <span className="text-right">Variance</span>
            </div>
            {budgetByCategory.map(c => {
              const variance = c.estimated - c.total
              return (
                <div key={c.name} className="grid grid-cols-4 px-6 py-3.5 border-b border-zinc-100 last:border-0 text-sm">
                  <span className="font-medium text-[#14161C]">{c.name.replace(/_/g, ' ')}</span>
                  <span className="text-right text-zinc-500">{fmt(c.estimated)}</span>
                  <span className="text-right font-semibold text-[#14161C]">{fmt(c.total)}</span>
                  <span className={`text-right font-semibold ${variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {variance < 0 ? '-' : '+'}{fmt(Math.abs(variance))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
