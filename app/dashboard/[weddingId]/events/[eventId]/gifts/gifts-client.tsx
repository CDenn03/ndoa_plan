'use client'
import { useState, useMemo } from 'react'
import { 
  Gift, Plus, CheckCircle, Heart, 
  Filter, Search, ExternalLink, 
  Package, Calendar, User
} from 'lucide-react'
import { Button, Input, Select, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'
import { format } from 'date-fns'

interface GiftRegistryItem {
  id: string
  name: string
  description?: string | null
  category: string
  price?: number | null
  quantity: number
  quantityReceived: number
  priority: string
  store?: string | null
  url?: string | null
  notes?: string | null
  createdAt: string
}

interface GiftReceived {
  id: string
  giftName: string
  giftDescription?: string | null
  giverName: string
  giverRelation?: string | null
  receivedDate: string
  estimatedValue?: number | null
  thankYouSent: boolean
  thankYouDate?: string | null
  notes?: string | null
  registryItemId?: string | null
  createdAt: string
}

interface GiftsClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialRegistryItems: GiftRegistryItem[]
  initialReceivedGifts: GiftReceived[]
}

type TabType = 'registry' | 'received'

const GIFT_CATEGORIES = [
  'KITCHEN', 'BEDROOM', 'BATHROOM', 'LIVING_ROOM', 'DINING', 
  'ELECTRONICS', 'EXPERIENCES', 'CASH', 'OTHER'
]

const PRIORITY_COLORS = {
  HIGH: 'bg-[#14161C]/10 text-[#14161C]',
  MEDIUM: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  LOW: 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
}

export function GiftsClient({ 
  weddingId, 
  eventId, 
  eventName,
  initialRegistryItems,
  initialReceivedGifts
}: Readonly<GiftsClientProps>) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('registry')
  const [registryItems, setRegistryItems] = useState<GiftRegistryItem[]>(initialRegistryItems)
  const [receivedGifts, setReceivedGifts] = useState<GiftReceived[]>(initialReceivedGifts)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddRegistry, setShowAddRegistry] = useState(false)
  const [showAddReceived, setShowAddReceived] = useState(false)

  // Filter registry items
  const filteredRegistryItems = useMemo(() => {
    let filtered = registryItems

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.store?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [registryItems, categoryFilter, priorityFilter, searchQuery])

  // Registry statistics
  const registryStats = useMemo(() => {
    const totalItems = registryItems.length
    const fulfilledItems = registryItems.filter(item => item.quantityReceived >= item.quantity).length
    const partialItems = registryItems.filter(item => 
      item.quantityReceived > 0 && item.quantityReceived < item.quantity
    ).length
    const totalValue = registryItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0)
    const receivedValue = registryItems.reduce((sum, item) => 
      sum + ((item.price || 0) * item.quantityReceived), 0
    )

    return { totalItems, fulfilledItems, partialItems, totalValue, receivedValue }
  }, [registryItems])

  // Received gifts statistics
  const receivedStats = useMemo(() => {
    const totalGifts = receivedGifts.length
    const thankYousSent = receivedGifts.filter(gift => gift.thankYouSent).length
    const pendingThankYous = totalGifts - thankYousSent
    const totalValue = receivedGifts.reduce((sum, gift) => sum + (gift.estimatedValue || 0), 0)

    return { totalGifts, thankYousSent, pendingThankYous, totalValue }
  }, [receivedGifts])

  const handleMarkThankYou = async (giftId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/gifts/received/${giftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          thankYouSent: true,
          thankYouDate: new Date().toISOString().split('T')[0]
        })
      })

      if (!res.ok) throw new Error('Failed to mark thank you')

      setReceivedGifts(prev => prev.map(gift => 
        gift.id === giftId 
          ? { ...gift, thankYouSent: true, thankYouDate: new Date().toISOString().split('T')[0] }
          : gift
      ))

      toast('Thank you marked as sent', 'success')
    } catch {
      toast('Failed to mark thank you', 'error')
    }
  }

  const fmt = (amount: number) => 
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount)

  const RegistryItemCard = ({ item }: { item: GiftRegistryItem }) => {
    const isFullyReceived = item.quantityReceived >= item.quantity
    const isPartiallyReceived = item.quantityReceived > 0 && item.quantityReceived < item.quantity
    const remaining = item.quantity - item.quantityReceived

    return (
      <div className={cn(
        "p-4 bg-white rounded-xl border transition-all hover:shadow-sm",
        isFullyReceived ? "border-[#1F4D3A]/20 bg-[#1F4D3A]/5" : "border-[#1F4D3A]/8"
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                "font-semibold text-[#14161C]",
                isFullyReceived && "line-through text-[#14161C]/60"
              )}>
                {item.name}
              </h3>
              {isFullyReceived && (
                <CheckCircle size={16} className="text-[#1F4D3A]" />
              )}
            </div>

            {item.description && (
              <p className="text-sm text-[#14161C]/70 mb-3 leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge className={PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-700'}>
                {item.priority} Priority
              </Badge>
              <span className="text-xs px-2 py-1 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                {item.category}
              </span>
              {isPartiallyReceived && (
                <Badge className="bg-[#D4A94F]/10 text-[#D4A94F]">
                  Partially Received
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-[#14161C]/50">Quantity: </span>
                <span className="font-semibold text-[#14161C]">
                  {item.quantityReceived}/{item.quantity}
                </span>
              </div>
              {item.price && (
                <div>
                  <span className="text-[#14161C]/50">Price: </span>
                  <span className="font-semibold text-[#D4A94F]">{fmt(item.price)}</span>
                </div>
              )}
            </div>

            {item.store && (
              <div className="text-xs text-[#14161C]/60 mb-2">
                <span className="font-medium">Store: </span>
                {item.store}
              </div>
            )}

            {!isFullyReceived && remaining > 0 && (
              <div className="text-xs text-[#D4A94F] font-medium">
                {remaining} still needed
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {item.url && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(item.url!, '_blank')}
                className="text-xs px-2 py-1"
              >
                <ExternalLink size={12} />
              </Button>
            )}
          </div>
        </div>

        {item.notes && (
          <div className="pt-3 border-t border-[#1F4D3A]/8">
            <p className="text-xs text-[#14161C]/60 leading-relaxed">{item.notes}</p>
          </div>
        )}
      </div>
    )
  }

  const ReceivedGiftCard = ({ gift }: { gift: GiftReceived }) => {
    return (
      <div className="p-4 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#D4A94F]/10 rounded-xl flex items-center justify-center">
                <Gift size={16} className="text-[#D4A94F]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#14161C]">{gift.giftName}</h3>
                <p className="text-sm text-[#14161C]/60">
                  From {gift.giverName}
                  {gift.giverRelation && ` (${gift.giverRelation})`}
                </p>
              </div>
            </div>

            {gift.giftDescription && (
              <p className="text-sm text-[#14161C]/70 mb-3 leading-relaxed">
                {gift.giftDescription}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-[#14161C]/60 mb-3">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {format(new Date(gift.receivedDate), 'MMM d, yyyy')}
              </div>
              {gift.estimatedValue && (
                <div>
                  <span className="font-medium text-[#D4A94F]">{fmt(gift.estimatedValue)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {gift.thankYouSent ? (
                <Badge className="bg-[#1F4D3A]/10 text-[#1F4D3A]">
                  <Heart size={10} />
                  Thank You Sent
                  {gift.thankYouDate && (
                    <span className="ml-1">
                      ({format(new Date(gift.thankYouDate), 'MMM d')})
                    </span>
                  )}
                </Badge>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => handleMarkThankYou(gift.id)}
                  className="text-xs px-3 py-1"
                >
                  <Heart size={12} />
                  Mark Thank You Sent
                </Button>
              )}
            </div>
          </div>
        </div>

        {gift.notes && (
          <div className="pt-3 border-t border-[#1F4D3A]/8">
            <p className="text-xs text-[#14161C]/60 leading-relaxed">{gift.notes}</p>
          </div>
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
              Gifts for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Manage your gift registry and track received gifts
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-[#F7F5F2] p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('registry')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'registry'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Registry ({registryItems.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'received'
                ? 'bg-white text-[#1F4D3A] shadow-sm'
                : 'text-[#14161C]/60 hover:text-[#14161C]'
            )}
          >
            Received ({receivedGifts.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'registry' && (
        <div>
          {/* Registry Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total Items
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#14161C]">{registryStats.totalItems}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Fulfilled
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{registryStats.fulfilledItems}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Package size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Partial
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#D4A94F]">{registryStats.partialItems}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total Value
                </span>
              </div>
              <p className="text-lg font-heading font-bold text-[#D4A94F]">
                {fmt(registryStats.totalValue)}
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-xl border border-[#1F4D3A]/8 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#14161C]/40" />
                  <Input
                    placeholder="Search registry items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {GIFT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                  ))}
                </Select>

                <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="all">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </Select>

                <Button onClick={() => setShowAddRegistry(true)}>
                  <Plus size={16} />
                  Add Item
                </Button>
              </div>
            </div>
          </div>

          {filteredRegistryItems.length === 0 ? (
            <EmptyState
              icon={<Gift size={40} className="text-[#1F4D3A]/40" />}
              title={registryItems.length === 0 ? "No registry items yet" : "No items match your filters"}
              description={
                registryItems.length === 0 
                  ? "Create your gift registry to let guests know what you'd like to receive."
                  : "Try adjusting your search or filter criteria."
              }
              action={
                registryItems.length === 0 ? (
                  <Button onClick={() => setShowAddRegistry(true)}>
                    <Plus size={16} />
                    Add Your First Item
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRegistryItems.map(item => (
                <RegistryItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'received' && (
        <div>
          {/* Received Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Package size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total Gifts
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#14161C]">{receivedStats.totalGifts}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Heart size={16} className="text-[#1F4D3A]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Thank Yous Sent
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{receivedStats.thankYousSent}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <User size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Pending
                </span>
              </div>
              <p className="text-2xl font-heading font-bold text-[#D4A94F]">{receivedStats.pendingThankYous}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className="text-[#D4A94F]" />
                <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                  Total Value
                </span>
              </div>
              <p className="text-lg font-heading font-bold text-[#D4A94F]">
                {fmt(receivedStats.totalValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-[#14161C]">
              Received Gifts
            </h3>
            <Button onClick={() => setShowAddReceived(true)}>
              <Plus size={16} />
              Record Gift
            </Button>
          </div>

          {receivedGifts.length === 0 ? (
            <EmptyState
              icon={<Package size={40} className="text-[#1F4D3A]/40" />}
              title="No gifts recorded yet"
              description="Start recording gifts as you receive them to keep track of thank you notes."
              action={
                <Button onClick={() => setShowAddReceived(true)}>
                  <Plus size={16} />
                  Record Your First Gift
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {receivedGifts.map(gift => (
                <ReceivedGiftCard key={gift.id} gift={gift} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}