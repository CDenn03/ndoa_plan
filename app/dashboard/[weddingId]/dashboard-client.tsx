'use client'
import { useMemo } from 'react'
import { AlertTriangle, Calendar, Image as ImageIcon, Clock } from 'lucide-react'
import { Badge, ProgressBar } from '@/components/ui'
import { format } from 'date-fns'
import Link from 'next/link'
import type { DashboardSummary } from '@/types'

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface UpcomingTask { id: string; title: string; dueDate: string; category?: string; isOverdue: boolean }
interface MoodImage { id: string; path: string; bucket: string; title?: string }

interface Props {
  wedding: {
    id: string; name: string; date: string; venue?: string
    themeColor: string; budget: number; couplePhotoPath?: string
  }
  summary: DashboardSummary
  recentRisks: { id: string; severity: string; message: string; category: string }[]
  upcomingEvents?: WeddingEvent[]
  upcomingTasks?: UpcomingTask[]
  moodImages?: MoodImage[]
}

const SEVERITY_BADGE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
}

const EVENT_COLORS: Record<string, string> = {
  WEDDING: 'bg-violet-400', RURACIO: 'bg-amber-400', RECEPTION: 'bg-sky-400',
  ENGAGEMENT: 'bg-pink-400', TRADITIONAL: 'bg-orange-400', CIVIL: 'bg-emerald-400',
  AFTER_PARTY: 'bg-purple-400', HONEYMOON: 'bg-rose-400', MOVING: 'bg-zinc-400',
}


function getBudgetColor(pct: number): string {
  if (pct > 100) return 'text-red-500'
  if (pct > 85) return 'text-amber-500'
  return 'text-[#14161C]'
}

export function DashboardClient({
  wedding, summary, recentRisks,
  upcomingEvents = [], upcomingTasks = [], moodImages = [],
}: Readonly<Props>) {
  const wid = wedding.id
  const weddingDate = new Date(wedding.date)
  const now = useMemo(() => Date.now(), [])
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
  const criticalHighRisks = recentRisks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').slice(0, 3)
  const overdueTasks = upcomingTasks.filter(t => t.isOverdue)
  const soonTasks = upcomingTasks.filter(t => !t.isOverdue)

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
          <div className="flex items-center gap-5">
            {wedding.couplePhotoPath ? (
              <img
                src={`/api/storage/signed-url?path=${encodeURIComponent(wedding.couplePhotoPath)}&bucket=media`}
                alt="Couple photo"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#CDB5F7]/40 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#CDB5F7]/20 flex items-center justify-center text-xl font-bold text-violet-600 flex-shrink-0">
                {wedding.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Wedding overview</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#14161C] leading-tight tracking-tight">{wedding.name}</h1>
              <p className="text-sm text-zinc-400 mt-2 flex items-center gap-2">
                <Calendar size={13} />
                {format(weddingDate, 'EEEE, d MMMM yyyy')}
                {wedding.venue && <><span className="text-zinc-200">·</span>{wedding.venue}</>}
              </p>
            </div>
          </div>
          <div className="bg-[#E5DF98]/30 rounded-2xl p-5 border border-[#E5DF98]">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin">
                {upcomingEvents.map(ev => {
                  const days = Math.max(0, Math.ceil((new Date(ev.date).getTime() - now) / 86400000))
                  return (
                    <div key={ev.id} className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${EVENT_COLORS[ev.type] ?? 'bg-zinc-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#14161C] truncate">{ev.name}</p>
                        <p className="text-[11px] text-zinc-400">{format(new Date(ev.date), 'MMM d')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-extrabold text-[#14161C] leading-none">{days}</p>
                        <p className="text-[10px] text-zinc-400">days</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <p className="text-4xl font-extrabold text-[#14161C] leading-none text-center">
                  {summary.daysToWedding > 0 ? summary.daysToWedding : '🎉'}
                </p>
                <p className="text-xs font-semibold text-zinc-500 mt-1.5 uppercase tracking-widest text-center">
                  {summary.daysToWedding > 0 ? 'days to go' : 'Today!'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-12">
        {/* Stats row */}
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
            <p className={`text-4xl font-extrabold leading-none ${getBudgetColor(summary.budgetPercent)}`}>{summary.budgetPercent}%</p>
            <p className="text-xs text-zinc-400 mt-1.5">{fmt(summary.totalCommitted)}</p>
          </Link>
          <Link href={`/dashboard/${wid}/risks`} className="pl-8 hover:opacity-70 transition-opacity">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Active risks</p>
            <p className={`text-4xl font-extrabold leading-none ${summary.criticalRisks > 0 ? 'text-red-500' : 'text-[#14161C]'}`}>{summary.activeRisks}</p>
            <p className="text-xs text-zinc-400 mt-1.5">{summary.criticalRisks > 0 ? `${summary.criticalRisks} critical` : 'None critical'}</p>
          </Link>
        </div>

        <hr className="border-zinc-100" />


        {/* Budget + RSVP */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14161C]">Budget</h2>
              <Link href={`/dashboard/${wid}/budget`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">View details →</Link>
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
            {summary.confirmedCount > 0 && summary.totalCommitted > 0 && (
              <p className="text-xs text-zinc-400 pt-1">
                Cost per confirmed guest: <span className="font-semibold text-[#14161C]">{fmt(summary.totalCommitted / summary.confirmedCount)}</span>
              </p>
            )}
          </div>
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14161C]">RSVP</h2>
              <Link href={`/dashboard/${wid}/guests`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">View guests →</Link>
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

        {/* Deadlines + Vision board */}
        {(upcomingTasks.length > 0 || moodImages.length > 0) && (
          <>
            <hr className="border-zinc-100" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {upcomingTasks.length > 0 && (
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#14161C] flex items-center gap-2">
                      <Clock size={16} className="text-zinc-400" />
                      Upcoming deadlines
                      {overdueTasks.length > 0 && (
                        <span className="text-[11px] font-bold bg-red-100 text-red-600 rounded-full px-2 py-0.5">{overdueTasks.length} overdue</span>
                      )}
                    </h2>
                    <Link href={`/dashboard/${wid}/checklist`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">View all →</Link>
                  </div>
                  <div className="space-y-1">
                    {overdueTasks.slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-2.5 border-l-2 border-red-400 pl-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#14161C] truncate">{t.title}</p>
                          <p className="text-xs text-red-500">Overdue · {format(new Date(t.dueDate), 'MMM d')}</p>
                        </div>
                      </div>
                    ))}
                    {soonTasks.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#14161C] truncate">{t.title}</p>
                          <p className="text-xs text-zinc-400">Due {format(new Date(t.dueDate), 'MMM d')}</p>
                        </div>
                        {t.category && <span className="text-[11px] text-zinc-400 flex-shrink-0">{t.category}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {moodImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#14161C] flex items-center gap-2">
                      <ImageIcon size={16} className="text-zinc-400" />
                      Vision board
                    </h2>
                    <Link href={`/dashboard/${wid}/moodboard`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">View full →</Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {moodImages.slice(0, 4).map(img => (
                      <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-zinc-100">
                        <img
                          src={`/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`}
                          alt={img.title ?? 'Mood board'}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Risks */}
        {criticalHighRisks.length > 0 && (
          <>
            <hr className="border-zinc-100" />
            <div className="bg-red-50/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#14161C] flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  What&apos;s at risk
                </h2>
                <Link href={`/dashboard/${wid}/risks`} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">View all →</Link>
              </div>
              <div className="space-y-2">
                {criticalHighRisks.map(r => (
                  <div key={r.id} className="flex items-start gap-3 py-2">
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
