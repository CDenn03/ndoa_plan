'use client'
import { useMemo, useState } from 'react'
import {
  AlertTriangle, Calendar, Clock, Image as ImageIcon,
  MapPin, Users, TrendingUp, Wallet, CalendarCheck, Check,
  Zap, ArrowRight, CheckCircle2, Plus,
} from 'lucide-react'
import { Badge, ProgressBar, cn } from '@/components/ui'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { DashboardSummary } from '@/types'
import { useVendors, useUpdateVendorStatus } from '@/hooks/use-vendors'

interface WeddingEvent { id: string; name: string; type: string; date: string }
interface UpcomingTask { id: string; title: string; dueDate: string; category?: string; isOverdue: boolean }
interface MoodImage { id: string; path: string; bucket: string; title?: string }
interface NextAppointment { id: string; title: string; startAt: string; location?: string }

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
  nextAppointment?: NextAppointment
}

const SEVERITY_BADGE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
}

const EVENT_COLORS: Record<string, string> = {
  WEDDING: 'bg-[#1F4D3A]', RURACIO: 'bg-amber-400', RECEPTION: 'bg-sky-400',
  ENGAGEMENT: 'bg-pink-400', TRADITIONAL: 'bg-orange-400', CIVIL: 'bg-emerald-400',
  AFTER_PARTY: 'bg-[#1F4D3A]/60', HONEYMOON: 'bg-rose-400', MOVING: 'bg-[#14161C]/25',
}

const EVENT_BAR_COLORS: Record<string, string> = {
  WEDDING: 'bg-[#1F4D3A]', RURACIO: 'bg-amber-400', RECEPTION: 'bg-sky-400',
  ENGAGEMENT: 'bg-pink-400', TRADITIONAL: 'bg-orange-400', CIVIL: 'bg-emerald-400',
  AFTER_PARTY: 'bg-[#1F4D3A]/60', HONEYMOON: 'bg-rose-400', MOVING: 'bg-zinc-300',
}

function getBudgetColor(pct: number) {
  if (pct > 100) return 'text-red-500'
  if (pct > 85) return 'text-amber-500'
  return 'text-[#14161C]'
}

// Captured once at module load — stable reference for countdown math
const MODULE_NOW = Date.now()

const STATUS_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending',   label: 'Pending' },
] as const
type VendorTab = typeof STATUS_TABS[number]['key']

const CONFIRMED_STATUSES = new Set(['CONFIRMED', 'COMPLETED'])
const PENDING_STATUSES   = new Set(['ENQUIRED', 'QUOTED', 'BOOKED'])

function VendorSnapshot({ weddingId, vendorCount, confirmedVendors }: Readonly<{
  weddingId: string; vendorCount: number; confirmedVendors: number
}>) {
  const [tab, setTab] = useState<VendorTab>('all')
  const { data: vendors = [], isLoading } = useVendors(weddingId)
  const updateStatus = useUpdateVendorStatus(weddingId)

  const filtered = useMemo(() => {
    if (tab === 'confirmed') return vendors.filter(v => CONFIRMED_STATUSES.has(v.status))
    if (tab === 'pending')   return vendors.filter(v => PENDING_STATUSES.has(v.status))
    return vendors
  }, [vendors, tab])

  const confirmPct = vendorCount > 0 ? Math.round(confirmedVendors / vendorCount * 100) : 0

  return (
    <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Vendors</p>
        <Link href={`/dashboard/${weddingId}/vendors`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="flex items-end gap-2">
        <p className="text-3xl font-extrabold text-sky-600 leading-none font-heading">{confirmedVendors}</p>
        <p className="text-sm text-[#14161C]/40 mb-0.5">of {vendorCount} confirmed</p>
      </div>
      <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-sky-400 transition-all duration-700" style={{ width: `${confirmPct}%` }} />
      </div>

      <div className="flex gap-1 bg-[#F7F5F2] rounded-xl p-1">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 text-xs py-1.5 rounded-lg transition-all',
              tab === t.key ? 'bg-white text-[#14161C] font-bold shadow-sm' : 'text-[#14161C]/40 font-medium hover:text-[#1F4D3A]'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <p className="text-xs text-[#14161C]/40 py-2 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#14161C]/40 py-2 text-center">None in this category</p>
        ) : filtered.slice(0, 6).map(v => {
          const isConfirmed = CONFIRMED_STATUSES.has(v.status)
          return (
            <div key={v.id} className="flex items-center gap-2.5 py-1.5">
              <div className="w-6 h-6 rounded-full bg-[#1F4D3A]/8 flex items-center justify-center text-[10px] font-bold text-[#1F4D3A] flex-shrink-0">
                {v.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#14161C] truncate">{v.name}</p>
                <p className="text-[10px] text-[#14161C]/40">{v.category.replaceAll('_', ' ')}</p>
              </div>
              {isConfirmed ? (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 flex-shrink-0 flex items-center gap-1">
                  <CheckCircle2 size={9} /> Confirmed
                </span>
              ) : (
                <button
                  onClick={() => updateStatus.mutate({ vendorId: v.id, status: 'CONFIRMED', currentVersion: v.version })}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#14161C]/40 hover:text-emerald-600 hover:bg-emerald-50 rounded-full px-2 py-0.5 transition-colors flex-shrink-0 border border-[#1F4D3A]/12 hover:border-emerald-200"
                  aria-label={`Confirm ${v.name}`}
                >
                  <Check size={9} /> Confirm
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardClient({
  wedding, summary, recentRisks,
  upcomingEvents = [], upcomingTasks = [], moodImages = [],
  nextAppointment,
}: Readonly<Props>) {
  const wid = wedding.id
  const weddingDate = new Date(wedding.date)
  const now = MODULE_NOW
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', currencyDisplay: 'code', maximumFractionDigits: 0 }).format(n)

  const criticalHighRisks = recentRisks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH')
  const overdueTasks = upcomingTasks.filter(t => t.isOverdue)
  const soonTasks = upcomingTasks.filter(t => !t.isOverdue)
  const twoWeeksOut = now + 14 * 86_400_000
  const upcomingTwoWeeks = upcomingTasks.filter(t => !t.isOverdue && new Date(t.dueDate).getTime() <= twoWeeksOut)

  const sortedEvents = useMemo(
    () => [...upcomingEvents]
      .map(ev => ({ ev, days: Math.max(0, Math.ceil((new Date(ev.date).getTime() - now) / 86400000)) }))
      .sort((a, b) => a.days - b.days),
    [upcomingEvents, now]
  )

  const declined = summary.guestCount - summary.confirmedCount - summary.pendingCount
  const contribPct = summary.totalPledged > 0 ? Math.round((summary.totalContribPaid / summary.totalPledged) * 100) : 0
  const remaining = summary.totalBudget - summary.totalActual
  const moodPreviews = moodImages.slice(0, 5)

  // Derive overall status
  const isAtRisk = summary.criticalRisks > 0 || overdueTasks.length > 2 || summary.budgetPercent > 100
  const statusLabel = isAtRisk ? 'Needs attention' : 'On track'
  const statusColor = isAtRisk ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
  const statusDot = isAtRisk ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'

  // Smart next actions
  const smartActions: { label: string; href: string }[] = []
  if (overdueTasks.length > 0) smartActions.push({ label: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention`, href: `/dashboard/${wid}/checklist` })
  if (summary.pendingCount > 5) smartActions.push({ label: `Send reminders to ${summary.pendingCount} pending guests`, href: `/dashboard/${wid}/guests` })
  if (summary.confirmedVendors < summary.vendorCount) smartActions.push({ label: `Confirm ${summary.vendorCount - summary.confirmedVendors} vendor${summary.vendorCount - summary.confirmedVendors > 1 ? 's' : ''}`, href: `/dashboard/${wid}/vendors` })
  if (summary.budgetPercent > 85 && summary.budgetPercent <= 100) smartActions.push({ label: 'Budget nearing limit — review spend', href: `/dashboard/${wid}/budget` })

  return (
    <div className="min-h-full">

      {/* ── Command Center Header ─────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-7 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">

            {/* Photo + identity */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {wedding.couplePhotoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/storage/signed-url?path=${encodeURIComponent(wedding.couplePhotoPath)}&bucket=media`}
                  alt="Couple" className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4A94F]/30 flex-shrink-0 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1F4D3A] to-[#16382B] flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-sm">
                  {wedding.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-0.5">Command Center</p>
                <h1 className="text-2xl md:text-3xl font-bold text-[#14161C] leading-tight tracking-tight font-heading truncate">{wedding.name}</h1>
                <p className="text-sm text-[#14161C]/40 mt-1 flex items-center gap-1.5">
                  <Calendar size={12} className="flex-shrink-0" />
                  {format(weddingDate, 'EEEE, d MMMM yyyy')}
                  {wedding.venue && <><span className="text-[#14161C]/15 mx-0.5">·</span><MapPin size={11} className="flex-shrink-0" />{wedding.venue}</>}
                </p>
              </div>
            </div>

            {/* Status + quick actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border', statusColor)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
                {statusLabel}
              </span>
              <Link href={`/dashboard/${wid}/checklist`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1F4D3A] text-white px-3 py-1.5 rounded-full hover:bg-[#16382B] transition-colors">
                <Plus size={12} /> Add task
              </Link>
              <Link href={`/dashboard/${wid}/payments`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#D4A94F] text-white px-3 py-1.5 rounded-full hover:bg-[#c49a40] transition-colors">
                <Wallet size={12} /> Record payment
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Smart actions banner ──────────────────────────────────────────── */}
        {smartActions.length > 0 && (
          <div className="rounded-2xl bg-[#1F4D3A]/4 border border-[#1F4D3A]/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#1F4D3A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap size={13} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1F4D3A] uppercase tracking-widest mb-2">What needs your attention</p>
                <div className="flex flex-wrap gap-2">
                  {smartActions.map((a, i) => (
                    <Link key={i} href={a.href}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F4D3A] bg-white border border-[#1F4D3A]/12 rounded-full px-3 py-1.5 hover:bg-[#1F4D3A] hover:text-white hover:border-[#1F4D3A] transition-all">
                      {a.label} <ArrowRight size={10} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Event timeline ────────────────────────────────────────────────── */}
        {upcomingEvents.length > 0 && (() => {
          const sliced = sortedEvents.slice(0, 4)
          const maxDays = Math.max(...sliced.map(s => s.days), 1)
          return (
            <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest">Event timeline</p>
                <Link href={`/dashboard/${wid}/events`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-3">
                {sliced.map(({ ev, days }) => {
                  const pct = Math.max(4, Math.round((1 - days / maxDays) * 100))
                  const barColor = EVENT_BAR_COLORS[ev.type] ?? 'bg-zinc-300'
                  const urgent = days <= 7
                  return (
                    <Link key={ev.id} href={`/dashboard/${wid}/events`} className="flex items-center gap-4 group">
                      <div className="flex items-center gap-2 w-36 flex-shrink-0">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', EVENT_COLORS[ev.type] ?? 'bg-zinc-300')} />
                        <p className="text-xs font-semibold text-[#14161C] truncate">{ev.name}</p>
                      </div>
                      <div className="flex-1 bg-[#F7F5F2] rounded-full h-2 overflow-hidden">
                        <div className={cn('h-2 rounded-full transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-24 flex-shrink-0 text-right">
                        <span className={cn('text-xs font-bold', urgent ? 'text-amber-500' : 'text-[#14161C]/60')}>
                          {days === 0 ? 'Today' : `${days}d`}
                        </span>
                        <span className="text-[10px] text-[#14161C]/30 ml-1">{format(new Date(ev.date), 'MMM d')}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Main grid: Deadlines + Insights ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-6">

          {/* Priority tasks */}
          <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={11} /> Priority tasks
                </p>
                {overdueTasks.length > 0 && (
                  <span className="text-[11px] font-bold bg-red-100 text-red-600 rounded-full px-2 py-0.5">{overdueTasks.length} overdue</span>
                )}
                {upcomingTwoWeeks.length > 0 && (
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">{upcomingTwoWeeks.length} this fortnight</span>
                )}
              </div>
              <Link href={`/dashboard/${wid}/checklist`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="flex items-center gap-3 py-6 text-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <p className="text-sm text-[#14161C]/40">No upcoming deadlines in the next 30 days.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {overdueTasks.slice(0, 2).map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-3 border-l-[3px] border-red-400 pl-4 rounded-r-xl bg-red-50/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14161C] truncate">{t.title}</p>
                      <p className="text-xs text-red-500 mt-0.5">Overdue · {format(new Date(t.dueDate), 'MMM d')}</p>
                    </div>
                    {t.category && <span className="text-[11px] font-medium text-[#14161C]/40 flex-shrink-0 bg-[#F7F5F2] px-2 py-0.5 rounded-full">{t.category}</span>}
                  </div>
                ))}
                {soonTasks.slice(0, Math.max(0, 5 - Math.min(overdueTasks.length, 2))).map((t, i, arr) => {
                  const daysLeft = Math.ceil((new Date(t.dueDate).getTime() - now) / 86400000)
                  const urgent = daysLeft <= 7
                  return (
                    <div key={t.id} className={cn(
                      'flex items-center gap-3 py-3 pl-4 border-l-[3px] rounded-r-xl',
                      urgent ? 'border-amber-300 bg-amber-50/30' : 'border-transparent',
                      i < arr.length - 1 ? 'border-b border-b-[#1F4D3A]/6' : ''
                    )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#14161C] truncate">{t.title}</p>
                        <p className={cn('text-xs mt-0.5', urgent ? 'text-amber-500' : 'text-[#14161C]/40')}>
                          Due {format(new Date(t.dueDate), 'MMM d')} {urgent && `· ${daysLeft}d left`}
                        </p>
                      </div>
                      {t.category && <span className="text-[11px] font-medium text-[#14161C]/40 flex-shrink-0 bg-[#F7F5F2] px-2 py-0.5 rounded-full">{t.category}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Insights panel: appointment + risks */}
          <div className="space-y-4">
            {/* Next appointment */}
            <Link href={`/dashboard/${wid}/appointments`}
              className="block rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 hover:border-[#1F4D3A]/20 hover:shadow-md transition-all space-y-3 shadow-sm">
              <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarCheck size={11} /> Next appointment
              </p>
              {nextAppointment ? (
                <>
                  <p className="text-base font-bold text-[#14161C] leading-snug font-heading">{nextAppointment.title}</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-[#14161C]/60 flex items-center gap-1.5">
                      <Clock size={12} className="flex-shrink-0 text-[#1F4D3A]/40" />
                      {format(new Date(nextAppointment.startAt), 'EEE, MMM d · h:mm a')}
                    </p>
                    <p className="text-xs text-[#D4A94F] font-semibold">{formatDistanceToNow(new Date(nextAppointment.startAt), { addSuffix: true })}</p>
                    {nextAppointment.location && (
                      <p className="text-xs text-[#14161C]/40 flex items-center gap-1.5 truncate">
                        <MapPin size={11} className="flex-shrink-0" />{nextAppointment.location}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#14161C]/40">No upcoming appointments.</p>
              )}
            </Link>

            {/* Risk alerts */}
            <Link href={`/dashboard/${wid}/risks`}
              className={cn(
                'block rounded-2xl border p-5 hover:shadow-md transition-all space-y-3 shadow-sm',
                summary.criticalRisks > 0 ? 'border-red-200 bg-red-50/50' : 'border-[#1F4D3A]/10 bg-white'
              )}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={11} className={summary.criticalRisks > 0 ? 'text-red-400' : ''} /> Risk alerts
                </p>
                {summary.activeRisks > 0 && (
                  <span className="text-[11px] font-bold text-[#14161C]/40">{summary.activeRisks} total</span>
                )}
              </div>
              {criticalHighRisks.length === 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-[#14161C]/60">No critical risks</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {criticalHighRisks.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-start gap-2">
                      <Badge variant={SEVERITY_BADGE[r.severity] ?? 'default'}>{r.severity}</Badge>
                      <p className="text-xs text-[#14161C]/60 leading-relaxed line-clamp-2">{r.message}</p>
                    </div>
                  ))}
                  {criticalHighRisks.length > 3 && (
                    <p className="text-xs text-red-500 font-semibold">+{criticalHighRisks.length - 3} more</p>
                  )}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* ── Budget power widget ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5">
              <Wallet size={11} /> Budget control
            </p>
            <Link href={`/dashboard/${wid}/budget`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
              View details <ArrowRight size={11} />
            </Link>
          </div>

          {/* Progress bar with label */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#14161C]/50 text-xs">Spent of total</span>
              <span className="font-bold text-[#14161C] text-sm">
                {fmt(summary.totalActual)} <span className="text-[#14161C]/30 font-normal">/ {fmt(summary.totalBudget)}</span>
              </span>
            </div>
            <ProgressBar value={summary.totalActual} max={summary.totalBudget} />
          </div>

          {/* Three stat columns */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100">
            <div className="pr-6">
              <p className={cn('text-2xl font-extrabold font-heading', getBudgetColor(summary.budgetPercent))}>{summary.budgetPercent}%</p>
              <p className="text-xs text-[#14161C]/40 mt-0.5">used</p>
            </div>
            <div className="px-6">
              <p className="text-2xl font-extrabold text-amber-500 font-heading">{fmt(summary.totalActual)}</p>
              <p className="text-xs text-[#14161C]/40 mt-0.5">committed</p>
            </div>
            <div className="pl-6">
              <p className={cn('text-2xl font-extrabold font-heading', remaining < 0 ? 'text-red-500' : 'text-emerald-600')}>{fmt(Math.abs(remaining))}</p>
              <p className="text-xs text-[#14161C]/40 mt-0.5">{remaining < 0 ? 'over budget' : 'remaining'}</p>
            </div>
          </div>

          {/* Warnings + insight */}
          <div className="flex flex-wrap gap-3 pt-1">
            {summary.budgetPercent > 100 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-3 py-1.5">
                <AlertTriangle size={11} /> Over budget by {fmt(Math.abs(remaining))}
              </div>
            )}
            {summary.budgetPercent > 85 && summary.budgetPercent <= 100 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5">
                <AlertTriangle size={11} /> Approaching budget limit
              </div>
            )}
            {summary.confirmedCount > 0 && summary.totalActual > 0 && (
              <div className="text-xs text-[#14161C]/40 flex items-center gap-1">
                Cost per confirmed guest: <span className="font-semibold text-[#14161C] ml-1">{fmt(summary.totalActual / summary.confirmedCount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Row: RSVP + Contributions + Vendors + Vision board ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_3fr] gap-6">

          {/* RSVP + Contributions stacked */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5"><Users size={11} /> RSVP</p>
                <Link href={`/dashboard/${wid}/guests`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
                  View guests <ArrowRight size={11} />
                </Link>
              </div>
              {[
                { label: 'Confirmed', count: summary.confirmedCount, pct: summary.guestCount > 0 ? Math.round(summary.confirmedCount / summary.guestCount * 100) : 0, color: 'bg-emerald-400' },
                { label: 'Pending', count: summary.pendingCount, pct: summary.guestCount > 0 ? Math.round(summary.pendingCount / summary.guestCount * 100) : 0, color: 'bg-amber-300' },
                { label: 'Declined', count: declined, pct: summary.guestCount > 0 ? Math.round(declined / summary.guestCount * 100) : 0, color: 'bg-red-300' },
              ].map(({ label, count, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#14161C]/55">{label}</span>
                    <span className="font-bold text-[#14161C]">{count}</span>
                  </div>
                  <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
                    <div className={cn('h-1.5 rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {summary.totalPledged > 0 && (
              <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={11} /> Contributions</p>
                  <Link href={`/dashboard/${wid}/contributions`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#14161C]/55">Collected of pledged</span>
                    <span className="font-bold text-[#14161C]">{contribPct}%</span>
                  </div>
                  <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#1F4D3A] transition-all duration-700" style={{ width: `${contribPct}%` }} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-lg font-extrabold text-[#1F4D3A] font-heading">{fmt(summary.totalContribPaid)}</p>
                    <p className="text-xs text-[#14161C]/40">collected</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-[#14161C]/40 font-heading">{fmt(summary.totalPledged)}</p>
                    <p className="text-xs text-[#14161C]/40">pledged · {summary.contributorCount} members</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vendors */}
          <VendorSnapshot weddingId={wid} vendorCount={summary.vendorCount} confirmedVendors={summary.confirmedVendors} />

          {/* Vision board */}
          <div className="rounded-2xl border border-[#1F4D3A]/10 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#1F4D3A]/50 uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={11} /> Vision board</p>
              <Link href={`/dashboard/${wid}/moodboard`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors flex items-center gap-1">
                View full <ArrowRight size={11} />
              </Link>
            </div>
            {moodPreviews.length === 0 ? (
              <div className="rounded-xl bg-[#F7F5F2] border border-[#1F4D3A]/8 aspect-[4/3] flex flex-col items-center justify-center gap-2">
                <ImageIcon size={28} className="text-[#14161C]/15" />
                <p className="text-xs text-[#14161C]/30">No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {moodPreviews[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/storage/signed-url?path=${encodeURIComponent(moodPreviews[0].path)}&bucket=${moodPreviews[0].bucket}`}
                    alt={moodPreviews[0].title ?? ''}
                    className="col-span-1 row-span-2 w-full h-full object-cover rounded-xl aspect-[2/3]" loading="lazy" />
                )}
                {moodPreviews.slice(1, 3).map(img => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={`/api/storage/signed-url?path=${encodeURIComponent(img.path)}&bucket=${img.bucket}`}
                    alt={img.title ?? ''} className="w-full aspect-square object-cover rounded-xl" loading="lazy" />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
