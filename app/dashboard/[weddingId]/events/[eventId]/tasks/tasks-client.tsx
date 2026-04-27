'use client'
import { useState, useMemo } from 'react'
import { 
  CheckSquare, Plus, Calendar, AlertTriangle, 
  Filter, Search, Clock, Flag
} from 'lucide-react'
import { Button, Input, Select, EmptyState, Badge } from '@/components/ui'
import { format, differenceInDays, isPast } from 'date-fns'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'

interface Task {
  id: string
  title: string
  description?: string | null
  category?: string | null
  priority: number
  dueDate?: string | null
  completed: boolean
  order: number
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
}

interface TasksClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialTasks: Task[]
}

const CATEGORIES = [
  'VENUE', 'CATERING', 'PHOTOGRAPHY', 'MUSIC', 'FLOWERS', 
  'ATTIRE', 'TRANSPORT', 'DOCUMENTATION', 'GUESTS', 'OTHER'
]

const PRIORITY_LABELS = {
  1: { label: 'High', color: 'bg-[#14161C]/10 text-[#14161C]' },
  2: { label: 'Medium', color: 'bg-[#D4A94F]/10 text-[#D4A94F]' },
  3: { label: 'Low', color: 'bg-[#1F4D3A]/10 text-[#1F4D3A]' }
}

export function TasksClient({ weddingId, eventId, eventName, initialTasks }: Readonly<TasksClientProps>) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Apply status filter
    if (filter === 'pending') {
      filtered = filtered.filter(task => !task.completed)
    } else if (filter === 'completed') {
      filtered = filtered.filter(task => task.completed)
    } else if (filter === 'overdue') {
      filtered = filtered.filter(task => 
        !task.completed && 
        task.dueDate && 
        isPast(new Date(task.dueDate))
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.category?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [tasks, filter, categoryFilter, searchQuery])

  // Task statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.completed).length
    const pending = total - completed
    const overdue = tasks.filter(t => 
      !t.completed && 
      t.dueDate && 
      isPast(new Date(t.dueDate))
    ).length

    return { total, completed, pending, overdue }
  }, [tasks])

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      const res = await fetch(`/api/weddings/${weddingId}/checklist/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      })

      if (!res.ok) throw new Error('Failed to update task')

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ))

      toast(task.completed ? 'Task marked as pending' : 'Task completed', 'success')
    } catch {
      toast('Failed to update task', 'error')
    }
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = task.dueDate && !task.completed && isPast(new Date(task.dueDate))
    const daysUntilDue = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null
    const priority = PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]

    return (
      <div className={cn(
        'p-4 bg-white rounded-xl border transition-all hover:shadow-sm',
        task.completed 
          ? 'border-[#1F4D3A]/20 bg-[#1F4D3A]/5' 
          : isOverdue 
          ? 'border-[#14161C]/20 bg-[#14161C]/5'
          : 'border-[#1F4D3A]/8'
      )}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggleTask(task.id)}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors',
              task.completed
                ? 'bg-[#1F4D3A] border-[#1F4D3A] text-white'
                : 'border-[#1F4D3A]/30 hover:border-[#1F4D3A]'
            )}
          >
            {task.completed && <CheckSquare size={12} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className={cn(
                'font-semibold text-[#14161C] leading-tight',
                task.completed && 'line-through text-[#14161C]/60'
              )}>
                {task.title}
              </h3>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {priority && (
                  <Badge className={priority.color}>
                    <Flag size={10} />
                    {priority.label}
                  </Badge>
                )}
                {isOverdue && (
                  <Badge className="bg-[#14161C]/10 text-[#14161C]">
                    <AlertTriangle size={10} />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>

            {task.description && (
              <p className={cn(
                'text-sm text-[#14161C]/70 mb-3 leading-relaxed',
                task.completed && 'text-[#14161C]/50'
              )}>
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-[#14161C]/50">
              {task.category && (
                <span className="px-2 py-1 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                  {task.category}
                </span>
              )}
              
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span className={isOverdue ? 'text-[#14161C]/70' : ''}>
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    {daysUntilDue !== null && daysUntilDue >= 0 && (
                      <span className="ml-1">
                        ({daysUntilDue === 0 ? 'Today' : `${daysUntilDue}d left`})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {task.assignedTo && (
                <span>Assigned to {task.assignedTo}</span>
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
              Tasks for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Manage your event checklist and track progress
            </p>
          </div>
          <Button onClick={() => setShowAddTask(true)}>
            <Plus size={16} />
            Add Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare size={16} className="text-[#1F4D3A]" />
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
              <AlertTriangle size={16} className="text-[#14161C]/60" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Overdue
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.overdue}</p>
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
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </Select>

            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={40} className="text-[#1F4D3A]/40" />}
          title={tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
          description={
            tasks.length === 0 
              ? "Start by adding tasks to keep track of everything you need to do for this event."
              : "Try adjusting your search or filter criteria."
          }
          action={
            tasks.length === 0 ? (
              <Button onClick={() => setShowAddTask(true)}>
                <Plus size={16} />
                Add Your First Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}