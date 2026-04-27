'use client'
import { useState } from 'react'
import { Plus, CheckSquare, DollarSign, Users, Building, Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter } from 'next/navigation'

interface QuickActionsProps {
  weddingId: string
  eventId: string
}

export function QuickActions({ weddingId, eventId }: Readonly<QuickActionsProps>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()

  const actions = [
    {
      icon: CheckSquare,
      label: 'Add Task',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => router.push(`/dashboard/${weddingId}/checklist?event=${eventId}&action=add`)
    },
    {
      icon: DollarSign,
      label: 'Add Expense',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => router.push(`/dashboard/${weddingId}/budget?event=${eventId}&action=add`)
    },
    {
      icon: Users,
      label: 'Invite Guest',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => router.push(`/dashboard/${weddingId}/guests?event=${eventId}&action=add`)
    },
    {
      icon: Building,
      label: 'Book Vendor',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => router.push(`/dashboard/${weddingId}/vendors?event=${eventId}&action=add`)
    },
    {
      icon: Calendar,
      label: 'Schedule Meeting',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      onClick: () => router.push(`/dashboard/${weddingId}/appointments?event=${eventId}&action=add`)
    }
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Actions */}
      {isExpanded && (
        <div className="mb-4 space-y-2">
          {actions.map((action, index) => (
            <div
              key={action.label}
              className="flex items-center justify-end"
              style={{
                animation: `slideInUp 0.2s ease-out ${index * 0.05}s both`
              }}
            >
              {/* Action Label */}
              <div className="mr-3 px-3 py-1 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap">
                {action.label}
              </div>
              
              {/* Action Button */}
              <button
                onClick={action.onClick}
                className={`w-12 h-12 rounded-full ${action.color} text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center`}
              >
                <action.icon size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full bg-[#1F4D3A] hover:bg-[#16382B] text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${
          isExpanded ? 'rotate-45' : 'rotate-0'
        }`}
      >
        {isExpanded ? <X size={24} /> : <Plus size={24} />}
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}