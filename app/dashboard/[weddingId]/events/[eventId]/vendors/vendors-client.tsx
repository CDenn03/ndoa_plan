'use client'
import { useState, useMemo } from 'react'
import { 
  Building, Plus, CheckCircle, Clock, 
  Filter, Search, Phone, Mail, MapPin,
  MessageSquare, AlertCircle, Star
} from 'lucide-react'
import { Button, Input, Select, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'
import { format } from 'date-fns'

interface VendorNote {
  id: string
  content: string
  createdAt: string
}

interface VendorEventAssignment {
  id: string
  notes?: string | null
}

interface Vendor {
  id: string
  name: string
  category: string
  status: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  notes?: string | null
  eventAssignments: VendorEventAssignment[]
  vendorNotes: VendorNote[]
  createdAt: string
}

interface VendorsClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialVendors: Vendor[]
}

const VENDOR_CATEGORIES = [
  'VENUE', 'CATERING', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'MUSIC', 
  'FLOWERS', 'DECORATION', 'TRANSPORT', 'ACCOMMODATION',
  'BEAUTY', 'ATTIRE', 'ENTERTAINMENT', 'OTHER'
]

const STATUS_COLORS = {
  ENQUIRED: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  QUOTED: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  BOOKED: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  CONFIRMED: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  CANCELLED: 'bg-[#14161C]/10 text-[#14161C]',
  COMPLETED: 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
}

export function VendorsClient({ weddingId, eventId, eventName, initialVendors }: Readonly<VendorsClientProps>) {
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddVendor, setShowAddVendor] = useState(false)

  // Filter vendors
  const filteredVendors = useMemo(() => {
    let filtered = vendors

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.status === statusFilter)
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.category === categoryFilter)
    }

    // Apply assignment filter
    if (assignmentFilter === 'assigned') {
      filtered = filtered.filter(vendor => vendor.eventAssignments.length > 0)
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(vendor => vendor.eventAssignments.length === 0)
    }
    // Note: 'confirmed' filter removed as VendorEventAssignment doesn't have confirmed field

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(query) ||
        vendor.category.toLowerCase().includes(query) ||
        vendor.contactName?.toLowerCase().includes(query) ||
        vendor.email?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [vendors, statusFilter, categoryFilter, assignmentFilter, searchQuery])

  // Vendor statistics
  const stats = useMemo(() => {
    const total = vendors.length
    const assigned = vendors.filter(v => v.eventAssignments.length > 0).length
    const booked = vendors.filter(v => 
      v.status === 'BOOKED' || v.status === 'CONFIRMED'
    ).length

    return { total, assigned, booked }
  }, [vendors])

  const handleAssignVendor = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/vendor-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      })

      if (!res.ok) throw new Error('Failed to assign vendor')

      const assignment = await res.json()

      setVendors(prev => prev.map(vendor => 
        vendor.id === vendorId 
          ? {
              ...vendor,
              eventAssignments: [...vendor.eventAssignments, assignment]
            }
          : vendor
      ))

      toast('Vendor assigned to event', 'success')
    } catch {
      toast('Failed to assign vendor', 'error')
    }
  }

  const handleConfirmAssignment = async (vendorId: string, assignmentId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/vendor-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true })
      })

      if (!res.ok) throw new Error('Failed to confirm assignment')

      setVendors(prev => prev.map(vendor => 
        vendor.id === vendorId 
          ? {
              ...vendor,
              eventAssignments: vendor.eventAssignments.map(assignment =>
                assignment.id === assignmentId 
                  ? { ...assignment, confirmed: true }
                  : assignment
              )
            }
          : vendor
      ))

      toast('Vendor assignment confirmed', 'success')
    } catch {
      toast('Failed to confirm assignment', 'error')
    }
  }

  const VendorCard = ({ vendor }: { vendor: Vendor }) => {
    const assignment = vendor.eventAssignments[0]
    const isAssigned = vendor.eventAssignments.length > 0
    const isConfirmed = assignment?.confirmed || false

    return (
      <div className="p-6 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-[#14161C] text-lg">{vendor.name}</h3>
              {isConfirmed && (
                <CheckCircle size={16} className="text-[#1F4D3A]" />
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge className={STATUS_COLORS[vendor.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700'}>
                {vendor.status}
              </Badge>
              <span className="text-xs px-2 py-1 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                {vendor.category}
              </span>
              {isAssigned && (
                <Badge className={isConfirmed ? 'bg-[#1F4D3A]/10 text-[#1F4D3A]' : 'bg-[#D4A94F]/10 text-[#D4A94F]'}>
                  {isConfirmed ? 'Confirmed' : 'Assigned'}
                </Badge>
              )}
            </div>

            {assignment && (
              <div className="mb-3 p-3 bg-[#F7F5F2] rounded-lg">
                <p className="text-sm font-medium text-[#14161C] mb-1">
                  Role: {assignment.role}
                </p>
                {assignment.notes && (
                  <p className="text-xs text-[#14161C]/60">{assignment.notes}</p>
                )}
              </div>
            )}

            <div className="space-y-1 text-xs text-[#14161C]/60">
              {vendor.contactName && (
                <p className="font-medium">Contact: {vendor.contactName}</p>
              )}
              {vendor.email && (
                <div className="flex items-center gap-1">
                  <Mail size={12} />
                  {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-1">
                  <Phone size={12} />
                  {vendor.phone}
                </div>
              )}
              {vendor.address && (
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  {vendor.address}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {!isAssigned ? (
              <Button 
                size="sm" 
                onClick={() => handleAssignVendor(vendor.id, vendor.category)}
                className="text-xs px-3 py-1"
              >
                <Plus size={12} />
                Assign
              </Button>
            ) : !isConfirmed ? (
              <Button 
                size="sm" 
                onClick={() => handleConfirmAssignment(vendor.id, assignment.id)}
                className="text-xs px-3 py-1"
              >
                <CheckCircle size={12} />
                Confirm
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-[#1F4D3A]">
                <Star size={12} />
                Confirmed
              </div>
            )}
          </div>
        </div>

        {/* Recent Notes */}
        {vendor.notes && vendor.notes.length > 0 && (
          <div className="pt-4 border-t border-[#1F4D3A]/8">
            <div className="flex items-center gap-1 mb-2">
              <MessageSquare size={12} className="text-[#14161C]/60" />
              <p className="text-xs font-semibold text-[#14161C]/60">Recent Notes</p>
            </div>
            <div className="space-y-2">
              {vendor.notes.slice(0, 2).map(note => (
                <div key={note.id} className="text-xs">
                  <p className="text-[#14161C]/70 leading-relaxed">{note.content}</p>
                  <p className="text-[#14161C]/40 mt-1">
                    {format(new Date(note.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {vendor.notes && (
          <div className="pt-4 border-t border-[#1F4D3A]/8 mt-4">
            <p className="text-xs text-[#14161C]/60 leading-relaxed">{vendor.notes}</p>
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
              Vendors for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Manage vendor assignments and track confirmations
            </p>
          </div>
          <Button onClick={() => setShowAddVendor(true)}>
            <Plus size={16} />
            Add Vendor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Building size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Total
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.total}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Plus size={16} className="text-[#D4A94F]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Assigned
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#D4A94F]">{stats.assigned}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Confirmed
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{stats.confirmed}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Booked
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{stats.booked}</p>
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
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="ENQUIRED">Enquired</option>
              <option value="QUOTED">Quoted</option>
              <option value="BOOKED">Booked</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>

            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {VENDOR_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>

            <Select value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value)}>
              <option value="all">All Assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              <option value="confirmed">Confirmed</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Vendors List */}
      {filteredVendors.length === 0 ? (
        <EmptyState
          icon={<Building size={40} className="text-[#1F4D3A]/40" />}
          title={vendors.length === 0 ? "No vendors yet" : "No vendors match your filters"}
          description={
            vendors.length === 0 
              ? "Start by adding vendors to manage assignments for this event."
              : "Try adjusting your search or filter criteria."
          }
          action={
            vendors.length === 0 ? (
              <Button onClick={() => setShowAddVendor(true)}>
                <Plus size={16} />
                Add Your First Vendor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredVendors.map(vendor => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  )
}