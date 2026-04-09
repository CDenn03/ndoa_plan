'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, ShoppingBag, DollarSign, CheckSquare, AlertTriangle,
  LayoutDashboard, Menu, X, Heart, LogOut, Settings, UserCheck,
  CreditCard, Calendar, BarChart2, Image, FileText, Gift,
  Truck, Zap, Sparkles, ChevronDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useWeddingStore } from '@/store/wedding-store'
import { signOut } from 'next-auth/react'
import { useSync } from '@/components/sync-provider'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface WeddingEvent { id: string; name: string; type: string }

const EVENT_TYPE_COLORS: Record<string, string> = {
  WEDDING: 'bg-violet-400', RURACIO: 'bg-amber-400', RECEPTION: 'bg-sky-400',
  ENGAGEMENT: 'bg-pink-400', TRADITIONAL: 'bg-orange-400', CIVIL: 'bg-emerald-400',
  AFTER_PARTY: 'bg-purple-400', HONEYMOON: 'bg-rose-400', MOVING: 'bg-zinc-400',
}

interface SidebarProps {
  weddingId: string
  weddingName: string
  culturalType?: string
}

export function Sidebar({ weddingId, weddingName, culturalType }: Readonly<SidebarProps>) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useWeddingStore()
  const { isOnline, circuitOpen } = useSync()
  const base = `/dashboard/${weddingId}`
  const [mounted, setMounted] = useState(false)
  const [eventsExpanded, setEventsExpanded] = useState(true)

  useEffect(() => { setMounted(true) }, [])
  const open = mounted && sidebarOpen

  const { data: events = [] } = useQuery<WeddingEvent[]>({
    queryKey: ['events', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/events`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60_000,
    enabled: mounted,
  })

  const isActive = (href: string) => {
    if (href === '') return pathname === base
    const to = `${base}${href}`
    return pathname === to || pathname.startsWith(to + '/')
  }

  const NavLink = ({ href, label, icon: Icon, indent = false }: {
    href: string; label: string; icon: React.ElementType; indent?: boolean
  }) => {
    const active = isActive(href)
    return (
      <Link
        href={`${base}${href}`}
        onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
        className={cn(
          'flex items-center gap-2.5 py-2 rounded-xl text-sm transition-colors',
          indent ? 'px-2.5 ml-4 text-xs' : 'px-3',
          active
            ? 'bg-[#CDB5F7]/20 text-violet-700 font-semibold'
            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 font-medium'
        )}
      >
        <Icon size={indent ? 13 : 15} className={active ? 'text-violet-600' : 'text-zinc-400'} />
        <span className="flex-1 truncate">{label}</span>
      </Link>
    )
  }

  const SectionLabel = ({ children }: { children: string }) => (
    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 px-3 pt-3 pb-1">{children}</p>
  )

  return (
    <>
      {open && (
        <button type="button" aria-label="Close navigation"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden w-full h-full cursor-default"
          onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-40 flex flex-col',
        'w-60 bg-white border-r transition-transform duration-200',
        'border-[hsl(var(--border))]',
        'lg:translate-x-0 lg:relative lg:flex',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CDB5F7]/30 flex items-center justify-center">
              <Heart size={14} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#14161C] leading-none">Ndoa</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[120px]">{weddingName}</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Sync status */}
        <div className="px-5 pb-3">
          {mounted && (() => {
            const syncLabel = circuitOpen ? 'Sync paused' : isOnline ? 'Connected' : 'Offline'
            return (
              <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', isOnline ? 'text-emerald-500' : 'text-amber-500')}>
                <div className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
                {syncLabel}
              </div>
            )
          })()}
        </div>

        <hr className="border-[hsl(var(--border))] mx-5" />

        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">

          {/* Overview — always first */}
          <NavLink href="" label="Overview" icon={LayoutDashboard} />

          {/* ── Events ── collapsible with dynamic sub-items */}
          <div className="mt-1">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Events</p>
              <button onClick={() => setEventsExpanded(v => !v)}
                className="text-zinc-300 hover:text-zinc-500 transition-colors" aria-label="Toggle events">
                {eventsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            </div>
            <NavLink href="/events" label="All events" icon={Calendar} />
            {eventsExpanded && events.length > 0 && (
              <ul className="mt-0.5 space-y-0.5">
                {events.map(ev => {
                  const evPath = `${base}/events/${ev.id}`
                  const active = pathname === evPath || pathname.startsWith(evPath + '/')
                  return (
                    <li key={ev.id}>
                      <Link href={evPath}
                        onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
                        className={cn(
                          'flex items-center gap-2.5 py-1.5 px-2.5 ml-4 rounded-xl text-xs transition-colors',
                          active
                            ? 'bg-[#CDB5F7]/20 text-violet-700 font-semibold'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 font-medium'
                        )}>
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', EVENT_TYPE_COLORS[ev.type] ?? 'bg-zinc-300')} />
                        <span className="truncate">{ev.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* ── Planning — tasks, appointments, dowry */}
          <div className="mt-1">
            <SectionLabel>Planning</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/checklist" label="Tasks" icon={CheckSquare} />
              <NavLink href="/appointments" label="Appointments" icon={Sparkles} />
              {culturalType && culturalType !== 'STANDARD' && (
                <NavLink href="/dowry" label="Dowry" icon={Heart} />
              )}
            </div>
          </div>

          {/* ── People — guests, check-in, vendors */}
          <div className="mt-1">
            <SectionLabel>People</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/guests" label="Guests" icon={Users} />
              <NavLink href="/guests/check-in" label="Check-in" icon={UserCheck} indent />
              <NavLink href="/vendors" label="Vendors" icon={ShoppingBag} />
            </div>
          </div>

          {/* ── Finance — budget, payments, contributions */}
          <div className="mt-1">
            <SectionLabel>Finance</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/budget" label="Budget" icon={DollarSign} />
              <NavLink href="/payments" label="Payments" icon={CreditCard} />
              <NavLink href="/contributions" label="Contributions" icon={Users} />
            </div>
          </div>

          {/* ── Execution — logistics, day-of */}
          <div className="mt-1">
            <SectionLabel>Execution</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/logistics" label="Logistics" icon={Truck} />
              <NavLink href="/day-of" label="Day-of" icon={Zap} />
            </div>
          </div>

          {/* ── Insights — risks, analytics */}
          <div className="mt-1">
            <SectionLabel>Insights</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/risks" label="Risk Alerts" icon={AlertTriangle} />
              <NavLink href="/analytics" label="Analytics" icon={BarChart2} />
            </div>
          </div>

          {/* ── Content — vision board, gifts, documents */}
          <div className="mt-1">
            <SectionLabel>Content</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/moodboard" label="Vision Board" icon={Image} />
              <NavLink href="/gifts" label="Gifts" icon={Gift} />
              <NavLink href="/documents" label="Documents" icon={FileText} />
            </div>
          </div>

          {/* ── Settings */}
          <div className="mt-1 pb-2">
            <SectionLabel>Settings</SectionLabel>
            <NavLink href="/settings" label="Settings" icon={Settings} />
          </div>

        </nav>

        {/* Footer */}
        <div className="px-5 py-5 border-t border-[hsl(var(--border))]">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-700 transition-colors font-medium"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton() {
  const { toggleSidebar } = useWeddingStore()
  return (
    <button
      onClick={toggleSidebar}
      className="lg:hidden p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors"
    >
      <Menu size={18} />
    </button>
  )
}
