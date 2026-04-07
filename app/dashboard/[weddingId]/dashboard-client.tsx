'use client'
import { Users, ShoppingBag, DollarSign, AlertTriangle, Calendar, CheckSquare, TrendingUp } from 'lucide-react'
import { StatCard, Card, CardHeader, CardContent, CardTitle, Badge, ProgressBar } from '@/components/ui'
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

export function DashboardClient({ wedding, summary, recentRisks }: Props) {
  const wid = wedding.id
  const weddingDate = new Date(wedding.date)
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {wedding.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5">
            <Calendar size={13} />
            {format(weddingDate, 'EEEE, d MMMM yyyy')}
            {wedding.venue && ` · ${wedding.venue}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.daysToWedding > 0 ? (
            <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{summary.daysToWedding}</p>
              <p className="text-xs text-violet-500 font-medium">days to go</p>
            </div>
          ) : (
            <div className="bg-green-600/10 border border-green-500/20 rounded-xl px-4 py-2 text-center">
              <p className="text-sm font-bold text-green-600">Today!</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href={`/dashboard/${wid}/guests`}>
          <StatCard label="Guests confirmed" value={summary.confirmedCount} sub={`${summary.guestCount} total invited`} color="green" />
        </Link>
        <Link href={`/dashboard/${wid}/vendors`}>
          <StatCard label="Vendors confirmed" value={summary.confirmedVendors} sub={`${summary.vendorCount} total vendors`} color="blue" />
        </Link>
        <Link href={`/dashboard/${wid}/budget`}>
          <StatCard label="Budget used" value={`${summary.budgetPercent}%`} sub={fmt(summary.totalCommitted)} color={summary.budgetPercent > 100 ? 'red' : summary.budgetPercent > 85 ? 'amber' : 'default'} />
        </Link>
        <Link href={`/dashboard/${wid}/risks`}>
          <StatCard label="Active risks" value={summary.activeRisks} sub={summary.criticalRisks > 0 ? `${summary.criticalRisks} critical` : 'None critical'} color={summary.criticalRisks > 0 ? 'red' : 'default'} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget overview</CardTitle>
            <DollarSign size={16} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-500">Committed + Spent</span>
              <span className="font-semibold">{fmt(summary.totalCommitted)} / {fmt(summary.totalBudget)}</span>
            </div>
            <ProgressBar value={summary.totalCommitted} max={summary.totalBudget} />
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { label: 'Spent', val: summary.totalSpent, color: 'text-red-500' },
                { label: 'Committed', val: summary.totalCommitted - summary.totalSpent, color: 'text-amber-500' },
                { label: 'Remaining', val: summary.totalBudget - summary.totalCommitted, color: 'text-green-500' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-base font-bold ${color}`}>{fmt(Math.max(0, val))}</p>
                  <p className="text-xs text-zinc-400">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RSVP breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>RSVP status</CardTitle>
            <Users size={16} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Confirmed', count: summary.confirmedCount, pct: summary.guestCount > 0 ? Math.round(summary.confirmedCount / summary.guestCount * 100) : 0, color: 'bg-green-500' },
              { label: 'Pending', count: summary.pendingCount, pct: summary.guestCount > 0 ? Math.round(summary.pendingCount / summary.guestCount * 100) : 0, color: 'bg-amber-400' },
              { label: 'Declined', count: summary.guestCount - summary.confirmedCount - summary.pendingCount, pct: summary.guestCount > 0 ? Math.round((summary.guestCount - summary.confirmedCount - summary.pendingCount) / summary.guestCount * 100) : 0, color: 'bg-red-400' },
            ].map(({ label, count, pct, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active risks */}
      {recentRisks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Active risks
            </CardTitle>
            <Link href={`/dashboard/${wid}/risks`} className="text-xs text-violet-500 hover:text-violet-700 font-medium">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRisks.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <Badge variant={SEVERITY_BADGE[r.severity] ?? 'default'}>{r.severity}</Badge>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{r.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
