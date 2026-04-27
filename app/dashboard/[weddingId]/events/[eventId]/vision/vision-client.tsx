'use client'
import { useState, useMemo } from 'react'
import { 
  Camera, Plus, Image, Trash2, 
  Filter, Search, Eye, Upload,
  Heart, Star, Palette
} from 'lucide-react'
import { Button, Input, Select, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'

interface MediaItem {
  id: string
  title: string
  description?: string | null
  category: string
  filePath: string
  fileType: string
  fileSize?: number | null
  tags?: string | null
  isFavorite: boolean
  createdAt: string
}

interface VisionClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialMediaItems: MediaItem[]
}

const VISION_CATEGORIES = [
  'FLOWERS', 'VENUE', 'ATTIRE', 'DECORATION', 'COLORS', 
  'LIGHTING', 'TABLESCAPE', 'CAKE', 'PHOTOGRAPHY_STYLE', 'OTHER'
]

export function VisionClient({ 
  weddingId, 
  eventId, 
  eventName,
  initialMediaItems
}: Readonly<VisionClientProps>) {
  const { toast } = useToast()
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMediaItems)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null)

  // Filter media items
  const filteredMediaItems = useMemo(() => {
    let filtered = mediaItems

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [mediaItems, categoryFilter, searchQuery])

  // Group media items by category
  const mediaByCategory = useMemo(() => {
    const grouped = filteredMediaItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, MediaItem[]>)

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
      count: items.length
    }))
  }, [filteredMediaItems])

  // Statistics
  const stats = useMemo(() => {
    const totalImages = mediaItems.length
    const favorites = mediaItems.filter(item => item.isFavorite).length
    const categories = new Set(mediaItems.map(item => item.category)).size

    return { totalImages, favorites, categories }
  }, [mediaItems])

  const handleToggleFavorite = async (itemId: string) => {
    const item = mediaItems.find(i => i.id === itemId)
    if (!item) return

    try {
      const res = await fetch(`/api/weddings/${weddingId}/media/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !item.isFavorite })
      })

      if (!res.ok) throw new Error('Failed to update favorite')

      setMediaItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, isFavorite: !i.isFavorite } : i
      ))

      toast(item.isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success')
    } catch {
      toast('Failed to update favorite', 'error')
    }
  }

  const handleDeleteImage = async (itemId: string) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/media/${itemId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete image')

      setMediaItems(prev => prev.filter(item => item.id !== itemId))
      toast('Image deleted', 'success')
    } catch {
      toast('Failed to delete image', 'error')
    }
  }

  const MediaItemCard = ({ item }: { item: MediaItem }) => {
    return (
      <div className="group relative bg-white rounded-xl border border-[#1F4D3A]/8 overflow-hidden hover:shadow-lg transition-all">
        {/* Image */}
        <div className="aspect-square relative overflow-hidden bg-[#F7F5F2]">
          <img
            src={`/api/storage/signed-url?path=${encodeURIComponent(item.filePath)}&bucket=media`}
            alt={item.title}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setSelectedImage(item)}
          />
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleToggleFavorite(item.id)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  item.isFavorite 
                    ? "bg-[#D4A94F] text-white" 
                    : "bg-white/90 text-[#14161C]/60 hover:text-[#D4A94F]"
                )}
              >
                <Heart size={14} className={item.isFavorite ? "fill-current" : ""} />
              </button>
              <button
                onClick={() => setSelectedImage(item)}
                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#14161C]/60 hover:text-[#1F4D3A] transition-colors"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => handleDeleteImage(item.id)}
                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#14161C]/60 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Favorite Badge */}
          {item.isFavorite && (
            <div className="absolute top-2 left-2">
              <div className="w-6 h-6 bg-[#D4A94F] rounded-full flex items-center justify-center">
                <Star size={12} className="text-white fill-current" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-[#14161C] mb-1 line-clamp-1">{item.title}</h3>
          
          <div className="flex items-center justify-between mb-2">
            {item.linkedToType && (
              <Badge className="bg-[#1F4D3A]/10 text-[#1F4D3A] text-xs">
                {item.linkedToType.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-[#14161C]/60 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {item.tags && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.split(',').slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs px-2 py-0.5 bg-[#F7F5F2] text-[#14161C]/60 rounded-full"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const ImageModal = ({ item, onClose }: { item: MediaItem; onClose: () => void }) => {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#1F4D3A]/8">
            <h3 className="font-semibold text-[#14161C]">{item.title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F7F5F2] flex items-center justify-center text-[#14161C]/60 hover:text-[#14161C]"
            >
              ×
            </button>
          </div>
          
          <div className="p-4">
            <img
              src={`/api/storage/signed-url?path=${encodeURIComponent(item.filePath)}&bucket=media`}
              alt={item.title}
              className="w-full max-h-[60vh] object-contain rounded-xl"
            />
            
            {item.description && (
              <p className="text-sm text-[#14161C]/70 mt-4 leading-relaxed">
                {item.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-4">
              <Badge className="bg-[#1F4D3A]/10 text-[#1F4D3A]">
                {item.category.replace('_', ' ')}
              </Badge>
              {item.isFavorite && (
                <Badge className="bg-[#D4A94F]/10 text-[#D4A94F]">
                  <Star size={10} />
                  Favorite
                </Badge>
              )}
            </div>
          </div>
        </div>
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
              Vision Board for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Collect inspiration images to visualize your perfect event
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Plus size={16} />
            Add Image
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Image size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Total Images
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.totalImages}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Heart size={16} className="text-[#D4A94F]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Favorites
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#D4A94F]">{stats.favorites}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Palette size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Categories
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">{stats.categories}</p>
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
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {VISION_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Vision Board */}
      {mediaByCategory.length === 0 ? (
        <EmptyState
          icon={<Camera size={40} className="text-[#1F4D3A]/40" />}
          title={mediaItems.length === 0 ? "No images yet" : "No images match your filters"}
          description={
            mediaItems.length === 0 
              ? "Start building your vision board by uploading inspiration images for your event."
              : "Try adjusting your search or filter criteria."
          }
          action={
            mediaItems.length === 0 ? (
              <Button onClick={() => setShowUpload(true)}>
                <Upload size={16} />
                Upload Your First Image
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {mediaByCategory.map(({ category, items, count }) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-[#14161C]">
                  {category.replace('_', ' ')} ({count})
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map(item => (
                  <MediaItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal 
          item={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </div>
  )
}