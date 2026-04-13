'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, Calendar, Clock, Image as ImageIcon, MapPin, Users, TrendingUp, Wallet, CalendarCheck, Check } from 'lucide-react'
import { Badge, ProgressBar } from '@/components/ui'
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
    <div className="rounded-2xl border border-[#1F4D3A]/8 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest">Vendors</p>
        <Link href={`/dashboard/${weddingId}/vendors`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">View all →</Link>
      </div>

      {/* Progress */}
      <div className="flex items-end gap-2">
        <p className="text-3xl font-extrabold text-sky-600 leading-none">{confirmedVendors}</p>
        <p className="text-sm text-[#14161C]/40 mb-0.5">of {vendorCount} confirmed</p>
      </div>
      <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${confirmPct}%` }} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1F4D3A]/6 rounded-2xl p-1">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 text-xs py-1.5 rounded-xl transition-all ${tab === t.key ? 'bg-white text-[#14161C] font-bold shadow-sm' : 'text-[#14161C]/40 font-medium hover:text-[#1F4D3A]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Vendor list */}
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
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 flex-shrink-0">Confirmed</span>
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

  // Asymmetric mood grid: first image tall, rest square
  const moodPreviews = moodImages.slice(0, 5)

  return (
    <div className="min-h-full">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 items-start">
          <div className="flex items-center gap-5">
            {wedding.couplePhotoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/storage/signed-url?path=${encodeURIComponent(wedding.couplePhotoPath)}&bucket=media`}
                alt="Couple" className="w-20 h-20 rounded-full object-cover border-2 border-[#D4A94F]/30 flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#1F4D3A]/8 flex items-center justify-center text-2xl font-bold text-[#1F4D3A] flex-shrink-0">
                {wedding.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Wedding overview</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#14161C] leading-tight tracking-tight">{wedding.name}</h1>
              <p className="text-sm text-[#14161C]/40 mt-2 flex items-center gap-2">
                <Calendar size={13} />
                {format(weddingDate, 'EEEE, d MMMM yyyy')}
                {wedding.venue && <><span className="text-[#14161C]/15">·</span>{wedding.venue}</>}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

        {/* ── Events countdown row ──────────────────────────────────────────── */}
        {upcomingEvents.length > 0 ? (
          <Link href={`/dashboard/${wid}/events`} className="block group">
            {(() => {
              const sliced = sortedEvents.slice(0, 4)
              return (
                <div className="grid gap-0 divide-x divide-zinc-100" style={{ gridTemplateColumns: `repeat(${sliced.length}, 1fr)` }}>
                  {sliced.map(({ ev, days }, i) => {
                    const padding = i === 0 ? 'pr-8' : i === sliced.length - 1 ? 'pl-8' : 'px-8'
                    const countColor = days === 0 ? 'text-[#1F4D3A]' : days <= 7 ? 'text-amber-500' : 'text-[#14161C]'
                    const countLabel = days === 0 ? 'Today!' : `${days === 1 ? 'day to go' : 'days to go'} · ${format(new Date(ev.date), 'MMM d')}`
                    return (
                      <div key={ev.id} className={`hover:opacity-70 transition-opacity ${padding}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${EVENT_COLORS[ev.type] ?? 'bg-[#14161C]/25'}`} />
                          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest truncate">{ev.name}</p>
                        </div>
                        <p className={`text-4xl font-extrabold leading-none ${countColor}`}>{days === 0 ? '🎉' : days}</p>
                        <p className="text-xs text-[#14161C]/40 mt-1.5">{countLabel}</p>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Link>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-100">
            <Link href={`/dashboard/${wid}/guests`} className="pr-8 hover:opacity-70 transition-opacity">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Guests confirmed</p>
              <p className="text-4xl font-extrabold text-emerald-600 leading-none">{summary.confirmedCount}</p>
              <p className="text-xs text-[#14161C]/40 mt-1.5">{summary.guestCount} total invited</p>
            </Link>
            <Link href={`/dashboard/${wid}/vendors`} className="px-8 hover:opacity-70 transition-opacity">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Vendors confirmed</p>
              <p className="text-4xl font-extrabold text-sky-600 leading-none">{summary.confirmedVendors}</p>
              <p className="text-xs text-[#14161C]/40 mt-1.5">{summary.vendorCount} total vendors</p>
            </Link>
            <Link href={`/dashboard/${wid}/budget`} className="px-8 hover:opacity-70 transition-opacity">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Budget used</p>
              <p className={`text-4xl font-extrabold leading-none ${getBudgetColor(summary.budgetPercent)}`}>{summary.budgetPercent}%</p>
              <p className="text-xs text-[#14161C]/40 mt-1.5">{fmt(summary.totalActual)}</p>
            </Link>
            <Link href={`/dashboard/${wid}/risks`} className="pl-8 hover:opacity-70 transition-opacity">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-1">Active risks</p>
              <p className={`text-4xl font-extrabold leading-none ${summary.criticalRisks > 0 ? 'text-red-500' : 'text-[#14161C]'}`}>{summary.activeRisks}</p>
              <p className="text-xs text-[#14161C]/40 mt-1.5">{summary.criticalRisks > 0 ? `${summary.criticalRisks} critical` : 'None critical'}</p>
            </Link>
          </div>
        )}

        <hr className="border-[#1F4D3A]/8" />

        {/* ── Row 1: Deadlines (wide) + Next appointment + Risks (stacked) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-10">

          {/* Deadlines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Upcoming deadlines
                {overdueTasks.length > 0 && (
                  <span className="ml-1 text-[11px] font-bold bg-red-100 text-red-600 rounded-full px-2 py-0.5">{overdueTasks.length} overdue</span>
                )}
                {upcomingTwoWeeks.length > 0 && (
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">{upcomingTwoWeeks.length} this fortnight</span>
                )}
              </p>
              <Link href={`/dashboard/${wid}/checklist`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">View all →</Link>
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-[#14161C]/40 py-4">No upcoming deadlines in the next 30 days.</p>
            ) : (
              <div className="space-y-0.5">
                {overdueTasks.slice(0, 2).map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5 border-l-2 border-red-400 pl-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14161C] truncate">{t.title}</p>
                      <p className="text-xs text-red-500">Overdue · {format(new Date(t.dueDate), 'MMM d')}</p>
                    </div>
                    {t.category && <span className="text-[11px] text-[#14161C]/40 flex-shrink-0">{t.category}</span>}
                  </div>
                ))}
                {soonTasks.slice(0, Math.max(0, 5 - Math.min(overdueTasks.length, 2))).map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-[#1F4D3A]/8 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14161C] truncate">{t.title}</p>
                      <p className="text-xs text-[#14161C]/40">Due {format(new Date(t.dueDate), 'MMM d')}</p>
                    </div>
                    {t.category && <span className="text-[11px] text-[#14161C]/40 flex-shrink-0">{t.category}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next appointment + Risks stacked */}
          <div className="space-y-6">
            <Link href={`/dashboard/${wid}/appointments`}
              className="block rounded-2xl border border-[#1F4D3A]/8 p-5 hover:border-[#1F4D3A]/12 hover:bg-[#F7F5F2]/50 transition-colors space-y-3">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5"><CalendarCheck size={12} /> Next appointment</p>
              {nextAppointment ? (
                <>
                  <p className="text-base font-bold text-[#14161C] leading-snug">{nextAppointment.title}</p>
                  <div className="space-y-1">
                    <p className="text-sm text-[#14161C]/55 flex items-center gap-1.5">
                      <Clock size={12} className="flex-shrink-0" />
                      {format(new Date(nextAppointment.startAt), 'EEE, MMM d · h:mm a')}
                    </p>
                    <p className="text-xs text-[#14161C]/40">{formatDistanceToNow(new Date(nextAppointment.startAt), { addSuffix: true })}</p>
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

            <Link href={`/dashboard/${wid}/risks`}
              className={`block rounded-2xl border p-5 hover:bg-[#F7F5F2]/50 transition-colors space-y-3 ${summary.criticalRisks > 0 ? 'border-red-100 bg-red-50/40' : 'border-[#1F4D3A]/8'}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={12} className={summary.criticalRisks > 0 ? 'text-red-400' : ''} /> Risk alerts
                </p>
                {summary.activeRisks > 0 && (
                  <span className="text-[11px] font-bold text-[#14161C]/40">{summary.activeRisks} total</span>
                )}
              </div>
              {criticalHighRisks.length === 0 ? (
                <div>
                  <p className="text-4xl font-extrabold text-[#14161C] leading-none">{summary.activeRisks}</p>
                  <p className="text-xs text-[#14161C]/40 mt-1">active · none critical</p>
                </div>
              ) : (
                <div className="space-y-2">
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

        <hr className="border-[#1F4D3A]/8" />

        {/* ── Row 2: Budget (wide) + RSVP + Contributions (stacked narrow) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10">

          {/* Budget */}
          <Link href={`/dashboard/${wid}/budget`} className="space-y-4 group">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5"><Wallet size={12} /> Budget</p>
              <span className="text-xs font-semibold text-[#1F4D3A] group-hover:text-[#16382B] transition-colors">View details →</span>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#14161C]/55">Spent of total</span>
                <span className="font-bold text-[#14161C]">{fmt(summary.totalActual)} <span className="text-[#14161C]/40 font-normal">/ {fmt(summary.totalBudget)}</span></span>
              </div>
              <ProgressBar value={summary.totalActual} max={summary.totalBudget} />
            </div>
            <div className="grid grid-cols-3 gap-0 divide-x divide-zinc-100 pt-1">
              <div className="pr-6">
                <p className={`text-2xl font-extrabold ${getBudgetColor(summary.budgetPercent)}`}>{summary.budgetPercent}%</p>
                <p className="text-xs text-[#14161C]/40 mt-0.5">used</p>
              </div>
              <div className="px-6">
                <p className="text-2xl font-extrabold text-amber-500">{fmt(summary.totalActual)}</p>
                <p className="text-xs text-[#14161C]/40 mt-0.5">committed</p>
              </div>
              <div className="pl-6">
                <p className={`text-2xl font-extrabold ${remaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(Math.abs(remaining))}</p>
                <p className="text-xs text-[#14161C]/40 mt-0.5">{remaining < 0 ? 'over budget' : 'remaining'}</p>
              </div>
            </div>
            {summary.confirmedCount > 0 && summary.totalActual > 0 && (
              <p className="text-xs text-[#14161C]/40">
                Cost per confirmed guest: <span className="font-semibold text-[#14161C]">{fmt(summary.totalActual / summary.confirmedCount)}</span>
              </p>
            )}
          </Link>

          {/* RSVP + Contributions stacked */}
          <div className="space-y-8">
            {/* RSVP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5"><Users size={12} /> RSVP</p>
                <Link href={`/dashboard/${wid}/guests`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">View guests →</Link>
              </div>
              {[
                { label: 'Confirmed', count: summary.confirmedCount, pct: summary.guestCount > 0 ? Math.round(summary.confirmedCount / summary.guestCount * 100) : 0, color: 'bg-emerald-400' },
                { label: 'Pending', count: summary.pendingCount, pct: summary.guestCount > 0 ? Math.round(summary.pendingCount / summary.guestCount * 100) : 0, color: 'bg-amber-300' },
                { label: 'Declined', count: declined, pct: summary.guestCount > 0 ? Math.round(declined / summary.guestCount * 100) : 0, color: 'bg-red-300' },
              ].map(({ label, count, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#14161C]/55">{label}</span>
                    <span className="font-bold text-[#14161C]">{count}</span>
                  </div>
                  <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Contributions */}
            {summary.totalPledged > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={12} /> Contributions</p>
                  <Link href={`/dashboard/${wid}/contributions`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">View all →</Link>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#14161C]/55">Collected of pledged</span>
                    <span className="font-bold text-[#14161C]">{contribPct}%</span>
                  </div>
                  <div className="bg-[#1F4D3A]/6 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#1F4D3A] transition-all duration-500" style={{ width: `${contribPct}%` }} />
                  </div>
                </div>
                <div className="flex gap-4 pt-0.5">
                  <div>
                    <p className="text-lg font-extrabold text-[#1F4D3A]">{fmt(summary.totalContribPaid)}</p>
                    <p className="text-xs text-[#14161C]/40">collected</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-[#14161C]/40">{fmt(summary.totalPledged)}</p>
                    <p className="text-xs text-[#14161C]/40">pledged · {summary.contributorCount} members</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <hr className="border-[#1F4D3A]/8" />

        {/* ── Row 3: Vendors + Vision board ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-10">

          {/* Vendors snapshot with tabs */}
          <VendorSnapshot weddingId={wid} vendorCount={summary.vendorCount} confirmedVendors={summary.confirmedVendors} />

          {/* Vision board — asymmetric */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={12} /> Vision board</p>
              <Link href={`/dashboard/${wid}/moodboard`} className="text-xs font-semibold text-[#1F4D3A] hover:text-[#16382B] transition-colors">View full →</Link>
            </div>
            {moodPreviews.length === 0 ? (
              <div className="rounded-2xl bg-[#F7F5F2] border border-[#1F4D3A]/8 aspect-[3/4] flex items-center justify-center">
                <ImageIcon size={32} className="text-[#14161C]/15" />
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
