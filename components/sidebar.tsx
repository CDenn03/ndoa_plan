'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, ShoppingBag, Clock, DollarSign, CheckSquare, AlertTriangle,
  LayoutDashboard, Menu, X, Heart, LogOut, Settings, UserCheck,
  CreditCard, Calendar, BarChart2, Image, FileText, Gift,
  Truck, Zap, Sparkles,
} from 'lucide-react'
import { cn } from '@/components/ui'
import { useWeddingStore } from '@/store/wedding-store'
import { signOut } from 'next-auth/react'
import { useSync } from '@/components/sync-provider'
import { useEffect, useState } from 'react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  indent?: boolean
  badge?: number
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [
      { href: '', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/events', label: 'Events', icon: Calendar },
      { href: '/checklist', label: 'Checklist', icon: CheckSquare },
      { href: '/timeline', label: 'Timeline', icon: Clock },
      { href: '/appointments', label: 'Appointments', icon: Sparkles },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/guests', label: 'Guests', icon: Users },
      { href: '/guests/check-in', label: 'Check-in', icon: UserCheck, indent: true },
      { href: '/vendors', label: 'Vendors', icon: ShoppingBag },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/budget', label: 'Budget', icon: DollarSign },
      { href: '/payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/risks', label: 'Risk Alerts', icon: AlertTriangle },
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/moodboard', label: 'Vision Board', icon: Image },
      { href: '/documents', label: 'Documents', icon: FileText },
      { href: '/gifts', label: 'Gifts', icon: Gift },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { href: '/logistics', label: 'Logistics', icon: Truck },
      { href: '/day-of', label: 'Day-of', icon: Zap },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

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
  // Defer to avoid hydration mismatch — runs only on client after mount
  useEffect(() => { setMounted(true) }, [])
  const open = mounted && sidebarOpen

  // Inject Dowry item into Planning group when cultural type is set
  const groups: NavGroup[] = NAV_GROUPS.map(group => {
    if (group.label === 'Planning' && culturalType && culturalType !== 'STANDARD') {
      return {
        ...group,
        items: [...group.items, { href: '/dowry', label: 'Dowry', icon: Heart } satisfies NavItem],
      }
    }
    return group
  })

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden w-full h-full cursor-default"
          onClick={toggleSidebar}
        />
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
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sync status */}
        <div className="px-5 pb-3">
        {mounted && (() => {
            const syncLabel = circuitOpen ? 'Sync paused' : isOnline ? 'Connected' : 'Offline'
            return (
              <div className={cn(
                'flex items-center gap-1.5 text-[11px] font-medium',
                isOnline ? 'text-emerald-500' : 'text-amber-500'
              )}>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                )} />
                {syncLabel}
              </div>
            )
          })()}
        </div>

        <hr className="border-[hsl(var(--border))] mx-5" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              {group.label && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 px-3 pt-4 pb-1">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, indent, badge }) => {
                  const to = `${base}${href}`
                  const isRoot = href === ''
                  const active = isRoot
                    ? pathname === base
                    : pathname === to || pathname.startsWith(to + '/')
                  return (
                    <li key={href}>
                      <Link
                        href={to}
                        onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
                        className={cn(
                          'flex items-center gap-3 py-2.5 rounded-xl text-sm transition-colors',
                          indent ? 'px-3 ml-5 text-xs' : 'px-3',
                          active
                            ? 'bg-[#CDB5F7]/20 text-violet-700 font-semibold'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 font-medium'
                        )}
                      >
                        <Icon
                          size={indent ? 13 : 15}
                          className={active ? 'text-violet-600' : 'text-zinc-400'}
                        />
                        <span className="flex-1">{label}</span>
                        {badge != null && badge > 0 && (
                          <span className="text-[10px] font-bold bg-violet-100 text-violet-600 rounded-full px-1.5 py-0.5 leading-none">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
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
