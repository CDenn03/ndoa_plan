'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  User, CheckSquare, DollarSign, Users, 
  Calendar, Wallet, Building, 
  MapPin, Gift, Camera, Truck, CalendarCheck,
  Heart, Crown, AlertTriangle, BarChart3
} from 'lucide-react'
import { cn } from '@/components/ui'
import { format } from 'date-fns'

interface EventInfo {
  id: string
  name: string
  type: string
  date: string
  venue: string | null
  isMain: boolean
}

interface EventTabsLayoutProps {
  weddingId: string
  eventId: string
  event: EventInfo
  children: React.ReactNode
}

// Phase 1: Core Tabs (Week 1)
const PHASE_1_TABS = [
  { id: 'profile', label: 'Overview', icon: User, href: 'profile' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: 'tasks' },
  { id: 'budget', label: 'Budget', icon: DollarSign, href: 'budget' },
  { id: 'guests', label: 'Guests', icon: Users, href: 'guests' },
]

// Phase 2: Extended Tabs (Week 2)
const PHASE_2_TABS = [
  { id: 'vendors', label: 'Vendors', icon: Building, href: 'vendors' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, href: 'schedule' },
  { id: 'payments', label: 'Payments', icon: Wallet, href: 'payments' },
]

// Phase 3: Advanced Features (Week 3)
const PHASE_3_TABS = [
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck, href: 'appointments' },
  { id: 'contributions', label: 'Contributions', icon: Heart, href: 'contributions' },
  { id: 'bridal-team', label: 'Bridal Team', icon: Crown, href: 'bridal-team' },
  { id: 'risk-alerts', label: 'Risk Alerts', icon: AlertTriangle, href: 'risk-alerts' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: 'analytics' },
  { id: 'logistics', label: 'Logistics', icon: Truck, href: 'logistics' },
  { id: 'gifts', label: 'Gifts', icon: Gift, href: 'gifts' },
  { id: 'vision', label: 'Vision', icon: Camera, href: 'vision' },
  { id: 'photography', label: 'Photography', icon: Camera, href: 'photography' },
]

// All phases are now available
const CURRENT_TABS = [...PHASE_1_TABS, ...PHASE_2_TABS, ...PHASE_3_TABS]

export function EventTabsLayout({ weddingId, eventId, event, children }: Readonly<EventTabsLayoutProps>) {
  const pathname = usePathname()
  
  // Extract current tab from pathname
  const currentTab = pathname.split('/').pop() || 'profile'

  return (
    <div className="min-h-full bg-[#F7F5F2]">
      {/* Event Header */}
      <div className="bg-white border-b border-[#1F4D3A]/8">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-heading font-bold text-[#14161C]">{event.name}</h1>
                {event.isMain && (
                  <span className="px-2 py-1 bg-[#D4A94F]/10 text-[#D4A94F] text-xs font-semibold rounded-full border border-[#D4A94F]/20">
                    Main Event
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-[#14161C]/60">
                <span>{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</span>
                {event.venue && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {event.venue}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-[#1F4D3A]/8">
        <div className="max-w-6xl mx-auto px-8">
          <nav className="overflow-x-auto tab-nav-scroll">
            <div className="flex space-x-6 min-w-max">
              {CURRENT_TABS.map((tab) => {
                const isActive = currentTab === tab.href
                const Icon = tab.icon
                
                return (
                  <Link
                    key={tab.id}
                    href={`/dashboard/${weddingId}/events/${eventId}/${tab.href}`}
                    className={cn(
                      'flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
                      isActive
                        ? 'border-[#1F4D3A] text-[#1F4D3A]'
                        : 'border-transparent text-[#14161C]/60 hover:text-[#14161C] hover:border-[#1F4D3A]/30'
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}