'use client'
import { useState, useMemo } from 'react'
import { 
  Users, Plus, UserCheck, UserX, 
  Filter, Search, Mail, Phone, Crown
} from 'lucide-react'
import { Button, Input, Select, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'

interface GuestAttendance {
  rsvpStatus: string
  checkedIn: boolean
  checkedInAt?: string | null
}

interface Guest {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  priority: string
  side: string
  mealPref?: string | null
  notes?: string | null
  eventAttendances: GuestAttendance[]
  createdAt: string
}

interface GuestsClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialGuests: Guest[]
}

const RSVP_STATUS_COLORS = {
  CONFIRMED: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  DECLINED: 'bg-[#14161C]/10 text-[#14161C]',
  PENDING: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  MAYBE: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  WAITLISTED: 'bg-[#14161C]/10 text-[#14161C]'
}

const PRIORITY_COLORS = {
  VIP: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  GENERAL: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  OVERFLOW: 'bg-[#14161C]/10 text-[#14161C]'
}

export function GuestsClient({ weddingId, eventId, eventName, initialGuests }: Readonly<GuestsClientProps>) {
  const { toast } = useToast()
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [rsvpFilter, setRsvpFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sideFilter, setSideFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddGuest, setShowAddGuest] = useState(false)

  // Filter guests
  const filteredGuests = useMemo(() => {
    let filtered = guests

    // Apply RSVP filter
    if (rsvpFilter !== 'all') {
      filtered = filtered.filter(guest => {
        const attendance = guest.eventAttendances[0]
        return attendance?.rsvpStatus === rsvpFilter
      })
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(guest => guest.priority === priorityFilter)
    }

    // Apply side filter
    if (sideFilter !== 'all') {
      filtered = filtered.filter(guest => guest.side === sideFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(guest =>
        guest.name.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.phone?.includes(query)
      )
    }

    return filtered
  }, [guests, rsvpFilter, priorityFilter, sideFilter, searchQuery])

  // Guest statistics
  const stats = useMemo(() => {
    const total = guests.length
    const confirmed = guests.filter(g => g.eventAttendances[0]?.rsvpStatus === 'CONFIRMED').length
    const declined = guests.filter(g => g.eventAttendances[0]?.rsvpStatus === 'DECLINED').length
    const pending = guests.filter(g => !g.eventAttendances[0] || g.eventAttendances[0]?.rsvpStatus === 'PENDING').length
    const checkedIn = guests.filter(g => g.eventAttendances[0]?.checkedIn).length
    const vip = guests.filter(g => g.priority === 'VIP').length

    return { total, confirmed, declined, pending, checkedIn, vip }
  }, [guests])

  const handleRsvpUpdate = async (guestId: string, status: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/guests/${guestId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, rsvpStatus: status })
      })

      if (!res.ok) throw new Error('Failed to update RSVP')

      setGuests(prev => prev.map(guest => 
        guest.id === guestId 
          ? {
              ...guest,
              eventAttendances: [{
                ...guest.eventAttendances[0],
                rsvpStatus: status
              }]
            }
          : guest
      ))

      toast('RSVP updated', 'success')
    } catch {
      toast('Failed to update RSVP', 'error')
    }
  }

  const handleCheckIn = async (guestId: string) => {
    const guest = guests.find(g => g.id === guestId)
    const isCheckedIn = guest?.eventAttendances[0]?.checkedIn

    try {
      const res = await fetch(`/api/weddings/${weddingId}/guests/${guestId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, checkedIn: !isCheckedIn })
      })

      if (!res.ok) throw new Error('Failed to update check-in')

      setGuests(prev => prev.map(g => 
        g.id === guestId 
          ? {
              ...g,
              eventAttendances: [{
                ...g.eventAttendances[0],
                checkedIn: !isCheckedIn,
                checkedInAt: !isCheckedIn ? new Date().toISOString() : null
              }]
            }
          : g
      ))

      toast(isCheckedIn ? 'Guest checked out' : 'Guest checked in', 'success')
    } catch {
      toast('Failed to update check-in', 'error')
    }
  }

  const GuestCard = ({ guest }: { guest: Guest }) => {
    const attendance = guest.eventAttendances[0]
    const rsvpStatus = attendance?.rsvpStatus || 'PENDING'
    const isCheckedIn = attendance?.checkedIn || false

    return (
      <div className="p-4 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#14161C]">
                {guest.name}
              </h3>
              {guest.priority === 'VIP' && (
                <Crown size={14} className="text-[#D4A94F]" />
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={RSVP_STATUS_COLORS[rsvpStatus as keyof typeof RSVP_STATUS_COLORS] || 'bg-gray-100 text-gray-700'}>
                {rsvpStatus}
              </Badge>
              <Badge className={PRIORITY_COLORS[guest.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-700'}>
                {guest.priority}
              </Badge>
              <span className="text-xs px-2 py-1 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                {guest.side} side
              </span>
              {isCheckedIn && (
                <Badge className="bg-[#1F4D3A]/10 text-[#1F4D3A]">
                  <UserCheck size={10} />
                  Checked In
                </Badge>
              )}
            </div>

            <div className="space-y-1 text-xs text-[#14161C]/60">
              {guest.email && (
                <div className="flex items-center gap-1">
                  <Mail size={12} />
                  {guest.email}
                </div>
              )}
              {guest.phone && (
                <div className="flex items-center gap-1">
                  <Phone size={12} />
                  {guest.phone}
                </div>
              )}
              {guest.mealPref && (
                <p>Meal Preference: {guest.mealPref}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {rsvpStatus === 'PENDING' && (
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRsvpUpdate(guest.id, 'CONFIRMED')}
                  className="text-xs px-2 py-1"
                >
                  Confirm
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRsvpUpdate(guest.id, 'DECLINED')}
                  className="text-xs px-2 py-1"
                >
                  Decline
                </Button>
              </div>
            )}

            {rsvpStatus === 'CONFIRMED' && (
              <Button 
                size="sm" 
                variant={isCheckedIn ? "outline" : "default"}
                onClick={() => handleCheckIn(guest.id)}
                className="text-xs px-3 py-1"
              >
                {isCheckedIn ? (
                  <>
                    <UserX size={12} />
                    Check Out
                  </>
                ) : (
                  <>
                    <UserCheck size={12} />
                    Check In
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {guest.notes && (
          <div className="pt-3 border-t border-[#1F4D3A]/8">
            <p className="text-xs text-[#14161C]/60">{guest.notes}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-[#14161C] mb-2">
              Guests for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Manage RSVPs and track attendance for your event
            </p>
          </div>
          <Button onClick={() => setShowAddGuest(true)}>
            <Plus size={16} />
            Add Guest
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Total
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.total}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Confirmed
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{stats.confirmed}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <UserX size={16} className="text-[#14161C]/60" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Declined
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.declined}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-[#D4A94F]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Pending
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#D4A94F]">{stats.pending}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Checked In
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{stats.checkedIn}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-[#D4A94F]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                VIP
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#D4A94F]">{stats.vip}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl border border-[#1F4D3A]/8 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#14161C]/40" />
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value)}>
              <option value="all">All RSVP Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DECLINED">Declined</option>
              <option value="PENDING">Pending</option>
              <option value="MAYBE">Maybe</option>
            </Select>

            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="VIP">VIP</option>
              <option value="GENERAL">General</option>
              <option value="OVERFLOW">Overflow</option>
            </Select>

            <Select value={sideFilter} onChange={(e) => setSideFilter(e.target.value)}>
              <option value="all">All Sides</option>
              <option value="BRIDE">Bride</option>
              <option value="GROOM">Groom</option>
              <option value="BOTH">Both</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Guests List */}
      {filteredGuests.length === 0 ? (
        <EmptyState
          icon={<Users size={40} className="text-[#1F4D3A]/40" />}
          title={guests.length === 0 ? "No guests yet" : "No guests match your filters"}
          description={
            guests.length === 0 
              ? "Start by adding guests to track RSVPs and attendance for this event."
              : "Try adjusting your search or filter criteria."
          }
          action={
            guests.length === 0 ? (
              <Button onClick={() => setShowAddGuest(true)}>
                <Plus size={16} />
                Add Your First Guest
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredGuests.map(guest => (
            <GuestCard key={guest.id} guest={guest} />
          ))}
        </div>
      )}
    </div>
  )
}