'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, ShoppingBag, Clock, DollarSign, CheckSquare, AlertTriangle, LayoutDashboard, Menu, X, Heart, LogOut, Settings, UserCheck } from 'lucide-react'
import { cn } from '@/components/ui'
import { useWeddingStore } from '@/store/wedding-store'
import { signOut } from 'next-auth/react'
import { useSync } from '@/components/sync-provider'

const NAV = [
  { href: '', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/guests/check-in', label: 'Check-in', icon: UserCheck, indent: true },
  { href: '/vendors', label: 'Vendors', icon: ShoppingBag },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/budget', label: 'Budget', icon: DollarSign },
  { href: '/checklist', label: 'Checklist', icon: CheckSquare },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/risks", label: "Risk Alerts", icon: AlertTriangle },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar({ weddingId, weddingName }: { weddingId: string; weddingName: string }) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useWeddingStore()
  const { isOnline, circuitOpen } = useSync()
  const base = `/dashboard/${weddingId}`

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-40 flex flex-col',
        'w-64 bg-zinc-950 text-zinc-100 transition-transform duration-200',
        'lg:translate-x-0 lg:relative lg:flex',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Heart size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Ndoa</p>
              <p className="text-xs text-zinc-400 truncate max-w-[140px]">{weddingName}</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-zinc-400 hover:text-zinc-200">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-2">
          <div className={cn('flex items-center gap-1.5 text-xs', isOnline ? 'text-green-400' : 'text-amber-400')}>
            <div className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-green-400 animate-pulse' : 'bg-amber-400')} />
            {circuitOpen ? 'Sync paused' : isOnline ? 'Connected' : 'Offline'}
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin">
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, ...rest }) => {
              const indent = 'indent' in rest ? rest.indent : false
              const to = `${base}${href}`
              const active = href === '' ? pathname === base : pathname === to || pathname.startsWith(to + '/')
              return (
                <li key={href}>
                  <Link href={to} onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
                    className={cn('flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      indent ? 'px-3 ml-4 text-xs' : 'px-3',
                      active ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                             : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200')}>
                    <Icon size={indent ? 13 : 16} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="px-5 py-4 border-t border-zinc-800">
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton() {
  const { toggleSidebar } = useWeddingStore()
  return (
    <button onClick={toggleSidebar}
      className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
      <Menu size={20} />
    </button>
  )
}
