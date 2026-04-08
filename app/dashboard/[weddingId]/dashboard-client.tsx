'use client'
import { Users, ShoppingBag, DollarSign, AlertTriangle, Calendar, CheckSquare } from 'lucide-react'
import { Badge, ProgressBar } from '@/components/ui'
import { format } from 'date-fns'
import Link from 'next/link'
import type { DashboardSummary } from '@/types'

interface Props {
  wedding: { id: string; name: string; date: string; venue?: string; themeColor: string; budget: number }
  summary: DashboardSummary
  recentRisks: { id: string; severity: string; message: string; category: string }[]
}

const SEVERITY_BADGE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
}

export function DashboardClient({ wedding, summary, recentRisks }: Readonly<Props>) {
  const wid = wedding.id
  const weddingDate = new Date(wedding.date)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="min-h-full">
      {/* Hero header — asymmetric, editorial */}
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Wedding overview</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#14161C] leading-tight tracking-tight">
              {wedding.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-3 flex items-center gap-2">
              <Calendar size={13} />
              {format(weddingDate, 'EEEE, d MMMM yyyy')}
              {wedding.venue && <><span className="text-zinc-200">·</span>{wedding.venue}</>}
            </p>
          </div>

          {/* Days counter — accent block */}
          {summary.daysToWedding > 0 ? (
            <div className="flex-shrink-0 bg-[#E5DF98]/40 rounded-2xl px-8 py-5 text-center border border-[#E5DF98]">
              <p className="text-5xl font-extrabold text-[#14161C] leading-none">{summary.daysToWedding}</p>
              <p className="text-xs font-semibold text-zinc-500 mt-1.5 uppercase tracking-widest">days to go</p>
            </div>
          ) : (
            <div className="flex-shrink-0 bg-emerald-50 rounded-2xl px-8 py-5 text-center border border-emerald-100">
              <p className="text-2xl font-extrabold text-emerald-600">Today!</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-12">

        {/* Stats row — open layout, no cards, just numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
          <Link href={`/dashboard/${wid}/guests`} className="pr-8 hover:opacity-70 transition-opacity">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Guests confirmed</p>
            <p className="text-4xl font-extrabold text-emerald-600 leading-none">{summary.confirmedCount}</p>
            <p className="text-xs text-zinc-400 mt-1.5">{summary.guestCount} total invited</p>
          </Link>
          <Link href={`/dashboard/${wid}/vendors`} className="px-8 hover:opacity-70 transition-opacity">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Vendors confirmed</p>
            <p className="text-4xl font-extrabold text-sky-600 leading-none">{summary.confirmedVendors}</p>
            <p className="text-xs text-zinc-400 mt-1.5">{summary.vendorCount} total vendors</p>
          </Link>
          <Link href={`/dashboard/${wid}/budget`} className="px-8 hover:opacity-70 transition-opacity">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Budget used</p>
            <p className={`text-4xl font-extrabold leading-none ${summary.budgetPercent > 100 ? 'text-red-500' : summary.budgetPercent > 85 ? 'text-amber-500' : 'text-[#14161C]'}`}>
              {summary.budgetPercent}%
            </p>
            <p className="text-xs text-zinc-400 mt-1.5">{fmt(summary.totalCommitted)}</p>
          </Link>
          <Link href={`/dashboard/${wid}/risks`} className="pl-8 hover:opacity-70 transition-opacity">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Active risks</p>
            <p className={`text-4xl font-extrabold leading-none ${summary.criticalRisks > 0 ? 'text-red-500' : 'text-[#14161C]'}`}>
              {summary.activeRisks}
            </p>
            <p className="text-xs text-zinc-400 mt-1.5">{summary.criticalRisks > 0 ? `${summary.criticalRisks} critical` : 'None critical'}</p>
          </Link>
        </div>

        <hr className="border-zinc-100" />

        {/* Asymmetric two-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Budget — wider column */}
          <div className="lg:col-span-3 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14161C]">Budget</h2>
              <Link href={`/dashboard/${wid}/budget`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                View details →
              </Link>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Committed of total</span>
                <span className="font-bold text-[#14161C]">{fmt(summary.totalCommitted)} <span className="text-zinc-400 font-normal">/ {fmt(summary.totalBudget)}</span></span>
              </div>
              <ProgressBar value={summary.totalCommitted} max={summary.totalBudget} />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1">
              {[
                { label: 'Spent', val: summary.totalSpent, color: 'text-red-500' },
                { label: 'Committed', val: summary.totalCommitted - summary.totalSpent, color: 'text-amber-500' },
                { label: 'Remaining', val: summary.totalBudget - summary.totalCommitted, color: 'text-emerald-600' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <p className={`text-xl font-bold ${color}`}>{fmt(Math.max(0, val))}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RSVP — narrower column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14161C]">RSVP</h2>
              <Link href={`/dashboard/${wid}/guests`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                View guests →
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Confirmed', count: summary.confirmedCount, pct: summary.guestCount > 0 ? Math.round(summary.confirmedCount / summary.guestCount * 100) : 0, color: 'bg-emerald-400' },
                { label: 'Pending', count: summary.pendingCount, pct: summary.guestCount > 0 ? Math.round(summary.pendingCount / summary.guestCount * 100) : 0, color: 'bg-amber-300' },
                { label: 'Declined', count: summary.guestCount - summary.confirmedCount - summary.pendingCount, pct: summary.guestCount > 0 ? Math.round((summary.guestCount - summary.confirmedCount - summary.pendingCount) / summary.guestCount * 100) : 0, color: 'bg-red-300' },
              ].map(({ label, count, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-zinc-500 font-medium">{label}</span>
                    <span className="font-bold text-[#14161C]">{count}</span>
                  </div>
                  <div className="bg-zinc-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active risks — only shown when present */}
        {recentRisks.length > 0 && (
          <>
            <hr className="border-zinc-100" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#14161C] flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  Active risks
                </h2>
                <Link href={`/dashboard/${wid}/risks`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                  View all →
                </Link>
              </div>
              <div className="space-y-2">
                {recentRisks.map(r => (
                  <div key={r.id} className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
                    <Badge variant={SEVERITY_BADGE[r.severity] ?? 'default'}>{r.severity}</Badge>
                    <p className="text-sm text-zinc-600 flex-1 leading-relaxed">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
