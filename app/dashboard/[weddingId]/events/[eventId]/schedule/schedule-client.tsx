'use client'
import { useState, useMemo } from 'react'
import { 
  Calendar, Clock, Plus, Users, Phone, Mail,
  MapPin, Edit, Trash2, User, Building
} from 'lucide-react'
import { Button, Input, Badge, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'
import { format, parse } from 'date-fns'

interface ProgramItem {
  id: string
  title: string
  description?: string | null
  startTime: string | null
  endTime?: string | null
  location?: string | null
  order: number
  createdAt: string
}

interface EventContact {
  id: string
  name: string
  role: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  createdAt: string
}

interface VendorContact {
  id: string
  name: string
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  category: string
}

interface EventInfo {
  id: string
  name: string
  date: string
  startTime?: string | null
  endTime?: string | null
}

interface ScheduleClientProps {
  weddingId: string
  eventId: string
  event: EventInfo
  initialProgramItems: ProgramItem[]
  initialContacts: EventContact[]
  vendorContacts: VendorContact[]
}

type TabType = 'program' | 'contacts'

export function ScheduleClient({ 
  weddingId, 
  eventId, 
  event,
  initialProgramItems,
  initialContacts,
  vendorContacts
}: Readonly<ScheduleClientProps>) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('program')
  const [programItems, setProgramItems] = useState<ProgramItem[]>(initialProgramItems)
  const [contacts, setContacts] = useState<EventContact[]>(initialContacts)
  const [showAddProgram, setShowAddProgram] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)

  // Sort program items by time
  const sortedProgramItems = useMemo(() => {
    return [...programItems].sort((a, b) => {
      // Handle null/undefined startTime values
      if (!a.startTime && !b.startTime) return 0
      if (!a.startTime) return 1
      if (!b.startTime) return -1
      
      const timeA = parse(a.startTime, 'HH:mm', new Date())
      const timeB = parse(b.startTime, 'HH:mm', new Date())
      return timeA.getTime() - timeB.getTime()
    })
  }, [programItems])

  const handleDeleteProgramItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/program/${itemId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete program item')

      setProgramItems(prev => prev.filter(item => item.id !== itemId))
      toast('Program item deleted', 'success')
    } catch {
      toast('Failed to delete program item', 'error')
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${eventId}/contacts/${contactId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete contact')

      setContacts(prev => prev.filter(contact => contact.id !== contactId))
      toast('Contact deleted', 'success')
    } catch {
      toast('Failed to delete contact', 'error')
    }
  }

  const ProgramItemCard = ({ item }: { item: ProgramItem }) => {
    const duration = item.startTime 
      ? (item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime)
      : 'Time TBD'

    return (
      <div className="p-4 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-[#1F4D3A]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#14161C]">{item.title}</h3>
                <p className="text-sm text-[#D4A94F] font-medium">{duration}</p>
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-[#14161C]/70 mb-3 leading-relaxed">
                {item.description}
              </p>
            )}

            {item.location && (
              <div className="flex items-center gap-1 text-xs text-[#14161C]/60">
                <MapPin size={12} />
                {item.location}
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
              onClick={() => handleDeleteProgramItem(item.id)}
              className="text-xs px-2 py-1 text-[#14161C]/60 hover:text-[#14161C]"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const ContactCard = ({ contact, isVendor = false }: { contact: EventContact | VendorContact; isVendor?: boolean }) => {
    return (
      <div className="p-4 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isVendor ? "bg-[#D4A94F]/10" : "bg-[#1F4D3A]/5"
              )}>
                {isVendor ? (
                  <Building size={16} className="text-[#D4A94F]" />
                ) : (
                  <User size={16} className="text-[#1F4D3A]" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-[#14161C]">{contact.name}</h3>
                <p className="text-sm text-[#14161C]/60">
                  {isVendor 
                    ? (contact as VendorContact).category
                    : (contact as EventContact).role
                  }
                </p>
              </div>
            </div>

            {isVendor && (contact as VendorContact).contactName && (
              <p className="text-sm text-[#14161C]/70 mb-2">
                Contact: {(contact as VendorContact).contactName}
              </p>
            )}

            <div className="space-y-1 text-xs text-[#14161C]/60">
              {(isVendor ? (contact as VendorContact).contactPhone : (contact as EventContact).phone) && (
                <div className="flex items-center gap-1">
                  <Phone size={12} />
                  <a href={`tel:${isVendor ? (contact as VendorContact).contactPhone : (contact as EventContact).phone}`} className="hover:text-[#1F4D3A]">
                    {isVendor ? (contact as VendorContact).contactPhone : (contact as EventContact).phone}
                  </a>
                </div>
              )}
              {(isVendor ? (contact as VendorContact).contactEmail : (contact as EventContact).email) && (
                <div className="flex items-center gap-1">
                  <Mail size={12} />
                  <a href={`mailto:${isVendor ? (contact as VendorContact).contactEmail : (contact as EventContact).email}`} className="hover:text-[#1F4D3A]">
                    {isVendor ? (contact as VendorContact).contactEmail : (contact as EventContact).email}
                  </a>
                </div>
              )}
            </div>

            {!isVendor && (contact as EventContact).notes && (
              <div className="mt-3 pt-3 border-t border-[#1F4D3A]/8">
                <p className="text-xs text-[#14161C]/60 leading-relaxed">
                  {(contact as EventContact).notes}
                </p>
              </div>
            )}
          </div>

          {!isVendor && (
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
                onClick={() => handleDeleteContact((contact as EventContact).id)}
                className="text-xs px-2 py-1 text-[#14161C]/60 hover:text-[#14161C]"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          )}
        </div>

        {isVendor && (
          <Badge className="bg-[#D4A94F]/10 text-[#D4A94F] text-xs">
            Vendor Contact
          </Badge>
        )}
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
              Schedule for {event.name}
            </h2>
            <p className="text-[#14161C]/60">
              {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
              {event.startTime && event.endTime && (
                <span className="ml-2">• {event.startTime} - {event.endTime}</span>
              )}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-[#F7F5F2] p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('program')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'program'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Program
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'contacts'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Contacts
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'program' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C]">
              Day-of Program
            </h3>
            <Button onClick={() => setShowAddProgram(true)}>
              <Plus size={16} />
              Add Program Item
            </Button>
          </div>

          {sortedProgramItems.length === 0 ? (
            <EmptyState
              icon={<Calendar size={40} className="text-[#1F4D3A]/40" />}
              title="No program items yet"
              description="Start building your event timeline by adding program items with specific times and details."
              action={
                <Button onClick={() => setShowAddProgram(true)}>
                  <Plus size={16} />
                  Add Your First Program Item
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {sortedProgramItems.map(item => (
                <ProgramItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C]">
              Event Contacts
            </h3>
            <Button onClick={() => setShowAddContact(true)}>
              <Plus size={16} />
              Add Contact
            </Button>
          </div>

          {contacts.length === 0 && vendorContacts.length === 0 ? (
            <EmptyState
              icon={<Users size={40} className="text-[#1F4D3A]/40" />}
              title="No contacts yet"
              description="Add key contacts for this event to keep important phone numbers and emails easily accessible."
              action={
                <Button onClick={() => setShowAddContact(true)}>
                  <Plus size={16} />
                  Add Your First Contact
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Custom Contacts */}
              {contacts.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-[#14161C] mb-4">
                    Custom Contacts ({contacts.length})
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {contacts.map(contact => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))}
                  </div>
                </div>
              )}

              {/* Vendor Contacts */}
              {vendorContacts.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-[#14161C] mb-4">
                    Vendor Contacts ({vendorContacts.length})
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {vendorContacts.map(contact => (
                      <ContactCard key={contact.id} contact={contact} isVendor />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}