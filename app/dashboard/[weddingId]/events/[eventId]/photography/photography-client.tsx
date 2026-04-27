'use client'
import { useState, useMemo } from 'react'
import { 
  Camera, Plus, CheckSquare, Clock, 
  User, Phone, Mail, MapPin,
  Edit, Trash2, Image, Star
} from 'lucide-react'
import { Button, Input, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'

interface Deliverable {
  id: string
  title: string
  description?: string | null
  priority: number
  dueDate?: string | null
  completed: boolean
  order: number
  assignedTo?: string | null
  notes?: string | null
  createdAt: string
}

interface VendorAssignment {
  role: string
  notes?: string | null
}

interface PhotographyVendor {
  id: string
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  notes?: string | null
  eventAssignments: VendorAssignment[]
}

interface PhotographyClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialDeliverables: Deliverable[]
  photographyVendor: PhotographyVendor | null
}

type TabType = 'deliverables' | 'vendor' | 'shotlist'

const SHOT_LIST_CATEGORIES = [
  'GETTING_READY', 'CEREMONY', 'RECEPTION', 'PORTRAITS', 
  'FAMILY_PHOTOS', 'DETAILS', 'CANDID_MOMENTS', 'VENUE_SHOTS'
]

const PRIORITY_COLORS = {
  1: 'bg-[#14161C]/10 text-[#14161C]',
  2: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  3: 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
}

export function PhotographyClient({ 
  weddingId, 
  eventId, 
  eventName,
  initialDeliverables,
  photographyVendor
}: Readonly<PhotographyClientProps>) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('deliverables')
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDeliverable, setShowAddDeliverable] = useState(false)

  // Filter deliverables
  const filteredDeliverables = useMemo(() => {
    if (!searchQuery) return deliverables

    const query = searchQuery.toLowerCase()
    return deliverables.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query)
    )
  }, [deliverables, searchQuery])

  // Deliverable statistics
  const stats = useMemo(() => {
    const total = deliverables.length
    const completed = deliverables.filter(d => d.completed).length
    const pending = total - completed
    const highPriority = deliverables.filter(d => d.priority === 1).length

    return { total, completed, pending, highPriority }
  }, [deliverables])

  const handleToggleDeliverable = async (deliverableId: string) => {
    const deliverable = deliverables.find(d => d.id === deliverableId)
    if (!deliverable) return

    try {
      const res = await fetch(`/api/weddings/${weddingId}/checklist/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !deliverable.completed })
      })

      if (!res.ok) throw new Error('Failed to update deliverable')

      setDeliverables(prev => prev.map(d => 
        d.id === deliverableId ? { ...d, completed: !d.completed } : d
      ))

      toast(deliverable.completed ? 'Deliverable marked as pending' : 'Deliverable completed', 'success')
    } catch {
      toast('Failed to update deliverable', 'error')
    }
  }

  const handleDeleteDeliverable = async (deliverableId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/checklist/${deliverableId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete deliverable')

      setDeliverables(prev => prev.filter(d => d.id !== deliverableId))
      toast('Deliverable deleted', 'success')
    } catch {
      toast('Failed to delete deliverable', 'error')
    }
  }

  const DeliverableCard = ({ deliverable }: { deliverable: Deliverable }) => {
    const priority = PRIORITY_COLORS[deliverable.priority as keyof typeof PRIORITY_COLORS]

    return (
      <div className={cn(
        'p-4 bg-white rounded-xl border transition-all hover:shadow-sm',
        deliverable.completed 
          ? 'border-[#1F4D3A]/20 bg-[#1F4D3A]/5' 
          : 'border-[#1F4D3A]/8'
      )}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggleDeliverable(deliverable.id)}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors',
              deliverable.completed
                ? 'bg-[#1F4D3A] border-[#1F4D3A] text-white'
                : 'border-[#1F4D3A]/30 hover:border-[#1F4D3A]'
            )}
          >
            {deliverable.completed && <CheckSquare size={12} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className={cn(
                'font-semibold text-[#14161C] leading-tight',
                deliverable.completed && 'line-through text-[#14161C]/60'
              )}>
                {deliverable.title}
              </h3>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {priority && (
                  <Badge className={priority}>
                    Priority {deliverable.priority}
                  </Badge>
                )}
              </div>
            </div>

            {deliverable.description && (
              <p className={cn(
                'text-sm text-[#14161C]/70 mb-3 leading-relaxed',
                deliverable.completed && 'text-[#14161C]/50'
              )}>
                {deliverable.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-[#14161C]/50">
                {deliverable.assignedTo && (
                  <span>Assigned to {deliverable.assignedTo}</span>
                )}
                
                {deliverable.dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    Due {new Date(deliverable.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex gap-1">
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
                  onClick={() => handleDeleteDeliverable(deliverable.id)}
                  className="text-xs px-2 py-1 text-[#14161C]/60 hover:text-[#14161C]"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>

            {deliverable.notes && (
              <div className="pt-3 border-t border-[#1F4D3A]/8 mt-3">
                <p className="text-xs text-[#14161C]/60 leading-relaxed">{deliverable.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const VendorCard = ({ vendor }: { vendor: PhotographyVendor }) => {
    const assignment = vendor.eventAssignments[0]

    return (
      <div className="p-6 bg-white rounded-xl border border-[#1F4D3A]/8">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 bg-[#1F4D3A]/5 rounded-2xl flex items-center justify-center">
            <Camera size={24} className="text-[#1F4D3A]" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-heading font-bold text-[#14161C] mb-1">
              {vendor.name}
            </h3>
            {assignment && (
              <p className="text-sm text-[#14161C]/60 mb-2">
                Role: {assignment.role}
              </p>
            )}
            <Badge className="bg-[#1F4D3A]/10 text-[#1F4D3A]">
              Confirmed Photographer
            </Badge>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3 mb-4">
          {vendor.contactName && (
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-[#1F4D3A]" />
              <span className="font-medium">Contact:</span>
              <span>{vendor.contactName}</span>
            </div>
          )}
          
          {vendor.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-[#1F4D3A]" />
              <a href={`tel:${vendor.phone}`} className="hover:text-[#1F4D3A]">
                {vendor.phone}
              </a>
            </div>
          )}
          
          {vendor.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-[#1F4D3A]" />
              <a href={`mailto:${vendor.email}`} className="hover:text-[#1F4D3A]">
                {vendor.email}
              </a>
            </div>
          )}
          
          {vendor.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-[#1F4D3A] mt-0.5" />
              <span>{vendor.address}</span>
            </div>
          )}
        </div>

        {/* Assignment Notes */}
        {assignment?.notes && (
          <div className="p-3 bg-[#F7F5F2] rounded-lg mb-4">
            <p className="text-sm text-[#14161C]/70 leading-relaxed">
              <span className="font-medium">Assignment Notes: </span>
              {assignment.notes}
            </p>
          </div>
        )}

        {/* Vendor Notes */}
        {vendor.notes && (
          <div className="pt-4 border-t border-[#1F4D3A]/8">
            <p className="text-sm text-[#14161C]/70 leading-relaxed">
              {vendor.notes}
            </p>
          </div>
        )}
      </div>
    )
  }

  const ShotListSection = () => {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Camera size={48} className="text-[#1F4D3A]/40 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-semibold text-[#14161C] mb-2">
            Shot List Coming Soon
          </h3>
          <p className="text-[#14161C]/60 max-w-md mx-auto">
            Create detailed shot lists to ensure your photographer captures all the important moments and details.
          </p>
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
              Photography for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Manage photography deliverables and coordinate with your photographer
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-[#F7F5F2] p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('deliverables')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'deliverables'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Deliverables ({deliverables.length})
          </button>
          <button
            onClick={() => setActiveTab('vendor')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'vendor'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Photographer
          </button>
          <button
            onClick={() => setActiveTab('shotlist')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'shotlist'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Shot List
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'deliverables' && (
        <div>
          {/* Deliverable Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Image size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.total}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Completed
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{stats.completed}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Pending
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#D4A94F]">{stats.pending}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Star size={16} className="text-[#14161C]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  High Priority
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.highPriority}</p>
            </div>
          </div>

          {/* Search and Add */}
          <div className="bg-white p-6 rounded-xl border border-[#1F4D3A]/8 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Camera size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#14161C]/40" />
                  <Input
                    placeholder="Search deliverables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button onClick={() => setShowAddDeliverable(true)}>
                <Plus size={16} />
                Add Deliverable
              </Button>
            </div>
          </div>

          {/* Deliverables List */}
          {filteredDeliverables.length === 0 ? (
            <EmptyState
              icon={<Camera size={40} className="text-[#1F4D3A]/40" />}
              title={deliverables.length === 0 ? "No deliverables yet" : "No deliverables match your search"}
              description={
                deliverables.length === 0 
                  ? "Add photography deliverables to track what you need from your photographer."
                  : "Try adjusting your search criteria."
              }
              action={
                deliverables.length === 0 ? (
                  <Button onClick={() => setShowAddDeliverable(true)}>
                    <Plus size={16} />
                    Add Your First Deliverable
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredDeliverables.map(deliverable => (
                <DeliverableCard key={deliverable.id} deliverable={deliverable} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendor' && (
        <div>
          {photographyVendor ? (
            <VendorCard vendor={photographyVendor} />
          ) : (
            <EmptyState
              icon={<Camera size={40} className="text-[#1F4D3A]/40" />}
              title="No photographer assigned"
              description="Assign a photographer to this event from your vendors list to see their details here."
              action={
                <Button onClick={() => window.location.href = `/dashboard/${weddingId}/events/${eventId}/vendors`}>
                  <Camera size={16} />
                  Manage Vendors
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === 'shotlist' && <ShotListSection />}
    </div>
  )
}