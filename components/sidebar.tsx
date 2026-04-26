'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, ShoppingBag, DollarSign, CheckSquare, AlertTriangle,
  LayoutDashboard, Menu, X, Heart, LogOut, Settings,
  CreditCard, Calendar, BarChart2, Image, FileText, Gift,
  Truck, Zap, Sparkles, ChevronDown, ChevronRight, Camera,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useWeddingStore } from '@/store/wedding-store'
import { signOut } from 'next-auth/react'
import { useSync } from '@/components/sync-provider'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

interface WeddingEvent { id: string; name: string; type: string }

const EVENT_TYPE_COLORS: Record<string, string> = {
  WEDDING:     'bg-[#1F4D3A]',
  RECEPTION:   'bg-sky-400',
  ENGAGEMENT:  'bg-pink-400',
  TRADITIONAL: 'bg-amber-400',
  CIVIL:       'bg-emerald-400',
  AFTER_PARTY: 'bg-[#1F4D3A]/60',
  HONEYMOON:   'bg-rose-400',
  MOVING:      'bg-[#14161C]/30',
}

interface NavLinkProps {
  href: string; label: string; icon: React.ElementType; indent?: boolean
  base: string; pathname: string; toggleSidebar: () => void
}

function NavLink({ href, label, icon: Icon, indent = false, base, pathname, toggleSidebar }: Readonly<NavLinkProps>) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const to = `${base}${href}`
  const active = mounted && (href === '' ? pathname === base : pathname === to || pathname.startsWith(to + '/'))
  return (
    <Link
      href={to}
      onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
      className={cn(
        'flex items-center gap-2.5 py-2 rounded-xl text-sm transition-colors',
        indent ? 'px-2.5 ml-4 text-xs' : 'px-3',
        active
          ? 'bg-[#1F4D3A]/10 text-[#1F4D3A] font-semibold'
          : 'text-[#14161C]/50 hover:bg-[#1F4D3A]/5 hover:text-[#1F4D3A] font-medium'
      )}
    >
      <Icon size={indent ? 13 : 15} className={active ? 'text-[#1F4D3A]' : 'text-[#14161C]/30'} />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  )
}

function SectionLabel({ children }: Readonly<{ children: string }>) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F4D3A]/30 px-3 pt-3 pb-1">{children}</p>
}

interface SidebarProps {
  weddingId: string
  weddingName: string
  culturalType?: string
  isDemo?: boolean
}

export function Sidebar({ weddingId, weddingName, culturalType, isDemo }: Readonly<SidebarProps>) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useWeddingStore()
  const { isOnline, circuitOpen } = useSync()
  const base = `/dashboard/${weddingId}`
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [eventsExpanded, setEventsExpanded] = useState(true)

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

  return (
    <>
      {open && (
        <button type="button" aria-label="Close navigation"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden w-full h-full cursor-default"
          onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-40 flex flex-col',
        'w-60 bg-white border-r border-[#1F4D3A]/8 transition-transform duration-200',
        'lg:translate-x-0 lg:relative lg:flex',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1F4D3A] flex items-center justify-center">
              <span className="text-white text-xs font-bold font-heading">N</span>
            </div>
            <div>
              <p className="text-sm font-heading font-semibold text-[#1F4D3A] leading-none">Ndoa</p>
              <p className="text-[11px] text-[#14161C]/40 mt-0.5 truncate max-w-[120px]">{weddingName}</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-[#14161C]/30 hover:text-[#14161C]/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Sync status */}
        <div className="px-5 pb-3">
          {mounted && (() => {
            const syncLabel = circuitOpen ? 'Sync paused' : isOnline ? 'Connected' : 'Offline'
            return (
              <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', isOnline ? 'text-emerald-600' : 'text-amber-500')}>
                <div className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400')} />
                {syncLabel}
              </div>
            )
          })()}
        </div>

        <hr className="border-[#1F4D3A]/8 mx-5" />

        {/* Demo mode banner */}
        {isDemo && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-[#D4A94F]/12 border border-[#D4A94F]/30">
            <p className="text-[11px] font-bold text-[#D4A94F] flex items-center gap-1.5 mb-0.5">
              <span>✨</span> Demo mode
            </p>
            <p className="text-[10px] text-[#14161C]/50 leading-relaxed">
              Read-only preview. <a href="/login" className="text-[#1F4D3A] font-semibold hover:underline">Sign in</a> to create your own wedding.
            </p>
          </div>
        )}

        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">

          <NavLink href="" label="Overview" icon={LayoutDashboard} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />

          {/* Events — collapsible */}
          <div className="mt-1">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F4D3A]/30">Events</p>
              <button onClick={() => setEventsExpanded(v => !v)}
                className="text-[#1F4D3A]/30 hover:text-[#1F4D3A]/60 transition-colors" aria-label="Toggle events">
                {eventsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            </div>
            <NavLink href="/events" label="All events" icon={Calendar} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
            {eventsExpanded && events.length > 0 && (
              <ul className="mt-0.5 space-y-0.5">
                {events.map(ev => {
                  const evPath = `${base}/events/${ev.id}`
                  const active = mounted && (pathname === evPath || pathname.startsWith(evPath + '/'))
                  return (
                    <li key={ev.id}>
                      <Link href={evPath}
                        onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
                        className={cn(
                          'flex items-center gap-2.5 py-1.5 px-2.5 ml-4 rounded-xl text-xs transition-colors',
                          active
                            ? 'bg-[#1F4D3A]/10 text-[#1F4D3A] font-semibold'
                            : 'text-[#14161C]/50 hover:bg-[#1F4D3A]/5 hover:text-[#1F4D3A] font-medium'
                        )}>
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', EVENT_TYPE_COLORS[ev.type] ?? 'bg-[#14161C]/20')} />
                        <span className="truncate">{ev.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-1">
            <SectionLabel>Planning</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/checklist" label="Tasks" icon={CheckSquare} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/budget" label="Budget" icon={DollarSign} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/vendors" label="Vendors" icon={ShoppingBag} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/appointments" label="Appointments" icon={Sparkles} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              {culturalType && culturalType !== 'STANDARD' && (
                <NavLink href="/dowry" label="Dowry" icon={Heart} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              )}
            </div>
          </div>

          <div className="mt-1">
            <SectionLabel>People</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/guests" label="Guests" icon={Users} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/contributions" label="Contributions" icon={Users} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/bridal-team" label="Bridal Team" icon={Heart} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
            </div>
          </div>

          <div className="mt-1">
            <SectionLabel>Execution</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/day-of" label="Schedule" icon={Zap} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/logistics" label="Logistics" icon={Truck} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/payments" label="Payments" icon={CreditCard} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
            </div>
          </div>

          <div className="mt-1">
            <SectionLabel>Insights</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/risks" label="Risk Alerts" icon={AlertTriangle} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/analytics" label="Analytics" icon={BarChart2} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
            </div>
          </div>

          <div className="mt-1">
            <SectionLabel>Content</SectionLabel>
            <div className="space-y-0.5">
              <NavLink href="/gifts" label="Gifts" icon={Gift} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/moodboard" label="Vision Board" icon={Image} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/photography" label="Media Production" icon={Camera} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
              <NavLink href="/documents" label="Documents" icon={FileText} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
            </div>
          </div>

          <div className="mt-1 pb-2">
            <SectionLabel>Settings</SectionLabel>
            <NavLink href="/settings" label="Settings" icon={Settings} base={base} pathname={pathname} toggleSidebar={toggleSidebar} />
          </div>

        </nav>

        {/* Footer */}
        <div className="px-5 py-5 border-t border-[#1F4D3A]/8">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-xs text-[#14161C]/35 hover:text-[#1F4D3A] transition-colors font-medium"
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
      className="lg:hidden p-2 rounded-xl hover:bg-[#1F4D3A]/6 text-[#14161C]/50 transition-colors"
    >
      <Menu size={18} />
    </button>
  )
}
