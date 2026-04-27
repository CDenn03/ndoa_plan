'use client'
import { useState, useMemo } from 'react'
import { 
  Truck, Plus, MapPin, Users, 
  Bed, Calendar, Phone, Mail,
  Edit, Trash2, Car, Home
} from 'lucide-react'
import { Button, Input, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'
import { format } from 'date-fns'

interface TransportRoute {
  id: string
  name: string
  description?: string | null
  departureLocation: string
  arrivalLocation: string
  departureTime?: string | null
  capacity?: number | null
  driverName?: string | null
  driverPhone?: string | null
  vehicleDetails?: string | null
  notes?: string | null
  createdAt: string
}

interface Accommodation {
  id: string
  name: string
  type: string
  address: string
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
  roomsBooked?: number | null
  guestCapacity?: number | null
  pricePerNight?: number | null
  totalCost?: number | null
  notes?: string | null
  createdAt: string
}

interface LogisticsClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialTransportRoutes: TransportRoute[]
  initialAccommodations: Accommodation[]
}

type TabType = 'transport' | 'accommodation'

const ACCOMMODATION_TYPES = [
  'HOTEL', 'GUEST_HOUSE', 'AIRBNB', 'RESORT', 'LODGE', 'PRIVATE_HOME', 'OTHER'
]

export function LogisticsClient({ 
  weddingId, 
  eventId, 
  eventName,
  initialTransportRoutes,
  initialAccommodations
}: Readonly<LogisticsClientProps>) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('transport')
  const [transportRoutes, setTransportRoutes] = useState<TransportRoute[]>(initialTransportRoutes)
  const [accommodations, setAccommodations] = useState<Accommodation[]>(initialAccommodations)
  const [showAddTransport, setShowAddTransport] = useState(false)
  const [showAddAccommodation, setShowAddAccommodation] = useState(false)

  // Transport statistics
  const transportStats = useMemo(() => {
    const totalRoutes = transportRoutes.length
    const totalCapacity = transportRoutes.reduce((sum, route) => sum + (route.capacity || 0), 0)
    const routesWithDrivers = transportRoutes.filter(route => route.driverName).length

    return { totalRoutes, totalCapacity, routesWithDrivers }
  }, [transportRoutes])

  // Accommodation statistics
  const accommodationStats = useMemo(() => {
    const totalAccommodations = accommodations.length
    const totalRooms = accommodations.reduce((sum, acc) => sum + (acc.roomsBooked || 0), 0)
    const totalCapacity = accommodations.reduce((sum, acc) => sum + (acc.guestCapacity || 0), 0)
    const totalCost = accommodations.reduce((sum, acc) => sum + (acc.totalCost || 0), 0)

    return { totalAccommodations, totalRooms, totalCapacity, totalCost }
  }, [accommodations])

  const handleDeleteTransport = async (routeId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/transport/${routeId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete transport route')

      setTransportRoutes(prev => prev.filter(route => route.id !== routeId))
      toast('Transport route deleted', 'success')
    } catch {
      toast('Failed to delete transport route', 'error')
    }
  }

  const handleDeleteAccommodation = async (accommodationId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/accommodation/${accommodationId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete accommodation')

      setAccommodations(prev => prev.filter(acc => acc.id !== accommodationId))
      toast('Accommodation deleted', 'success')
    } catch {
      toast('Failed to delete accommodation', 'error')
    }
  }

  const fmt = (amount: number) => 
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount)

  const TransportCard = ({ route }: { route: TransportRoute }) => {
    return (
      <div className="p-6 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                <Car size={20} className="text-[#1F4D3A]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#14161C] text-lg">{route.name}</h3>
                {route.description && (
                  <p className="text-sm text-[#14161C]/60">{route.description}</p>
                )}
              </div>
            </div>

            {/* Route Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-[#1F4D3A]" />
                <span className="font-medium">{route.departureLocation}</span>
                <span className="text-[#14161C]/40">→</span>
                <span className="font-medium">{route.arrivalLocation}</span>
              </div>

              {route.departureTime && (
                <div className="flex items-center gap-2 text-sm text-[#14161C]/70">
                  <Calendar size={14} />
                  Departure: {route.departureTime}
                </div>
              )}

              {route.capacity && (
                <div className="flex items-center gap-2 text-sm text-[#14161C]/70">
                  <Users size={14} />
                  Capacity: {route.capacity} passengers
                </div>
              )}
            </div>

            {/* Driver Information */}
            {route.driverName && (
              <div className="p-3 bg-[#F7F5F2] rounded-lg mb-4">
                <p className="text-sm font-medium text-[#14161C] mb-1">
                  Driver: {route.driverName}
                </p>
                {route.driverPhone && (
                  <div className="flex items-center gap-1 text-xs text-[#14161C]/60">
                    <Phone size={10} />
                    {route.driverPhone}
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Details */}
            {route.vehicleDetails && (
              <div className="text-xs text-[#14161C]/60 mb-3">
                <span className="font-medium">Vehicle: </span>
                {route.vehicleDetails}
              </div>
            )}

            {route.notes && (
              <div className="pt-3 border-t border-[#1F4D3A]/8">
                <p className="text-xs text-[#14161C]/60 leading-relaxed">{route.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs px-2 py-1"
            >
              <Edit size={12} />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleDeleteTransport(route.id)}
              className="text-xs px-2 py-1 text-[#14161C]/60 hover:text-[#14161C]"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const AccommodationCard = ({ accommodation }: { accommodation: Accommodation }) => {
    return (
      <div className="p-6 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#D4A94F]/10 rounded-xl flex items-center justify-center">
                <Home size={20} className="text-[#D4A94F]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#14161C] text-lg">{accommodation.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-[#1F4D3A]/10 text-[#1F4D3A]">
                    {accommodation.type}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-sm mb-3">
              <MapPin size={14} className="text-[#1F4D3A] mt-0.5 flex-shrink-0" />
              <span className="text-[#14161C]/70">{accommodation.address}</span>
            </div>

            {/* Dates */}
            {(accommodation.checkInDate || accommodation.checkOutDate) && (
              <div className="flex items-center gap-2 text-sm text-[#14161C]/70 mb-3">
                <Calendar size={14} />
                {accommodation.checkInDate && accommodation.checkOutDate ? (
                  <span>
                    {format(new Date(accommodation.checkInDate), 'MMM d')} - {format(new Date(accommodation.checkOutDate), 'MMM d, yyyy')}
                  </span>
                ) : accommodation.checkInDate ? (
                  <span>Check-in: {format(new Date(accommodation.checkInDate), 'MMM d, yyyy')}</span>
                ) : accommodation.checkOutDate ? (
                  <span>Check-out: {format(new Date(accommodation.checkOutDate), 'MMM d, yyyy')}</span>
                ) : null}
              </div>
            )}

            {/* Capacity & Rooms */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {accommodation.roomsBooked && (
                <div className="text-sm">
                  <span className="text-[#14161C]/50">Rooms: </span>
                  <span className="font-semibold text-[#14161C]">{accommodation.roomsBooked}</span>
                </div>
              )}
              {accommodation.guestCapacity && (
                <div className="text-sm">
                  <span className="text-[#14161C]/50">Capacity: </span>
                  <span className="font-semibold text-[#14161C]">{accommodation.guestCapacity} guests</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            {(accommodation.pricePerNight || accommodation.totalCost) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {accommodation.pricePerNight && (
                  <div className="text-sm">
                    <span className="text-[#14161C]/50">Per night: </span>
                    <span className="font-semibold text-[#D4A94F]">{fmt(accommodation.pricePerNight)}</span>
                  </div>
                )}
                {accommodation.totalCost && (
                  <div className="text-sm">
                    <span className="text-[#14161C]/50">Total: </span>
                    <span className="font-semibold text-[#D4A94F]">{fmt(accommodation.totalCost)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Contact Information */}
            {(accommodation.contactName || accommodation.contactPhone || accommodation.contactEmail) && (
              <div className="p-3 bg-[#F7F5F2] rounded-lg mb-4">
                {accommodation.contactName && (
                  <p className="text-sm font-medium text-[#14161C] mb-1">
                    Contact: {accommodation.contactName}
                  </p>
                )}
                <div className="space-y-1">
                  {accommodation.contactPhone && (
                    <div className="flex items-center gap-1 text-xs text-[#14161C]/60">
                      <Phone size={10} />
                      <a href={`tel:${accommodation.contactPhone}`} className="hover:text-[#1F4D3A]">
                        {accommodation.contactPhone}
                      </a>
                    </div>
                  )}
                  {accommodation.contactEmail && (
                    <div className="flex items-center gap-1 text-xs text-[#14161C]/60">
                      <Mail size={10} />
                      <a href={`mailto:${accommodation.contactEmail}`} className="hover:text-[#1F4D3A]">
                        {accommodation.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {accommodation.notes && (
              <div className="pt-3 border-t border-[#1F4D3A]/8">
                <p className="text-xs text-[#14161C]/60 leading-relaxed">{accommodation.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs px-2 py-1"
            >
              <Edit size={12} />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleDeleteAccommodation(accommodation.id)}
              className="text-xs px-2 py-1 text-[#14161C]/60 hover:text-[#14161C]"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-[#14161C] mb-2">
              Logistics for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Manage transport routes and accommodation arrangements
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-[#F7F5F2] p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('transport')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'transport'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Transport
          </button>
          <button
            onClick={() => setActiveTab('accommodation')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'accommodation'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Accommodation
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'transport' && (
        <div>
          {/* Transport Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Truck size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Routes
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#14161C]">{transportStats.totalRoutes}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total Capacity
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#D4A94F]">{transportStats.totalCapacity}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Car size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  With Drivers
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{transportStats.routesWithDrivers}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C]">
              Transport Routes
            </h3>
            <Button onClick={() => setShowAddTransport(true)}>
              <Plus size={16} />
              Add Route
            </Button>
          </div>

          {transportRoutes.length === 0 ? (
            <EmptyState
              icon={<Truck size={40} className="text-[#1F4D3A]/40" />}
              title="No transport routes yet"
              description="Add transport routes to help guests get to and from your event location."
              action={
                <Button onClick={() => setShowAddTransport(true)}>
                  <Plus size={16} />
                  Add Your First Route
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {transportRoutes.map(route => (
                <TransportCard key={route.id} route={route} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'accommodation' && (
        <div>
          {/* Accommodation Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Bed size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Properties
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#14161C]">{accommodationStats.totalAccommodations}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Home size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Rooms
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#D4A94F]">{accommodationStats.totalRooms}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Capacity
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{accommodationStats.totalCapacity}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total Cost
                </span>
              </div>
              <p className="text-lg font-heading font-bold text-[#D4A94F]">
                {fmt(accommodationStats.totalCost)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C]">
              Accommodation
            </h3>
            <Button onClick={() => setShowAddAccommodation(true)}>
              <Plus size={16} />
              Add Accommodation
            </Button>
          </div>

          {accommodations.length === 0 ? (
            <EmptyState
              icon={<Bed size={40} className="text-[#1F4D3A]/40" />}
              title="No accommodation yet"
              description="Add accommodation options for out-of-town guests and wedding party members."
              action={
                <Button onClick={() => setShowAddAccommodation(true)}>
                  <Plus size={16} />
                  Add Your First Accommodation
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {accommodations.map(accommodation => (
                <AccommodationCard key={accommodation.id} accommodation={accommodation} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}