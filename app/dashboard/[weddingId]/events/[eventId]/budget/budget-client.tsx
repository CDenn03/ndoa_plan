'use client'
import { useState, useMemo } from 'react'
import { 
  DollarSign, Plus, TrendingUp, TrendingDown, 
  Search, Wallet, AlertTriangle
} from 'lucide-react'
import { Button, Input, Select, EmptyState, ProgressBar, cn } from '@/components/ui'
import { 
  calculateBudgetSummary, 
  groupBudgetByCategory, 
  formatCurrency, 
  calculateUtilization, 
  calculateVariance,
  sanitizeNumeric
} from '@/lib/budget-helpers'

interface BudgetLine {
  id: string
  category: string
  description: string
  estimated: number
  actual: number
  notes?: string | null
  createdAt: string
  updatedAt: string
}

interface Payment {
  id: string
  amount: number
  description: string
  paymentDate: string
  status: string
  budgetLineId?: string | null
  createdAt: string
}

interface BudgetClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialBudgetLines: BudgetLine[]
  initialPayments: Payment[]
}

interface BudgetLineCardProps {
  line: BudgetLine
  payments: Payment[]
  fmt: (amount: number) => string
}

function BudgetLineCard({ line, payments, fmt }: Readonly<BudgetLineCardProps>) {
  // Sanitize all numeric values to prevent NaN errors
  const sanitizedEstimated = sanitizeNumeric(line.estimated)
  const sanitizedActual = sanitizeNumeric(line.actual)
  
  const variance = calculateVariance(sanitizedActual, sanitizedEstimated)
  const utilizationPercentage = calculateUtilization(sanitizedActual, sanitizedEstimated)
  const isOverBudget = variance > 0
  const linkedPayments = payments.filter(p => p.budgetLineId === line.id)

  return (
    <div className="p-4 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-[#14161C] mb-1">{line.description}</h3>
          <span className="text-xs px-2 py-1 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
            {line.category}
          </span>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-heading font-bold text-[#14161C]">
            {fmt(sanitizedActual)}
          </p>
          <p className="text-sm text-[#14161C]/60">
            of {fmt(sanitizedEstimated)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <ProgressBar 
          value={sanitizedActual} 
          max={sanitizedEstimated}
          className="h-2"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-[#14161C]/50">
            {utilizationPercentage.toFixed(0)}% utilized
          </span>
          {isOverBudget && (
            <div className="flex items-center gap-1 text-xs text-[#14161C]/60">
              <AlertTriangle size={10} />
              Over by {fmt(Math.abs(variance))}
            </div>
          )}
        </div>
      </div>

      {/* Linked Payments */}
      {linkedPayments.length > 0 && (
        <div className="pt-3 border-t border-[#1F4D3A]/8">
          <p className="text-xs font-semibold text-[#14161C]/60 mb-2">
            Recent Payments ({linkedPayments.length})
          </p>
          <div className="space-y-1">
            {linkedPayments.slice(0, 2).map(payment => (
              <div key={payment.id} className="flex justify-between text-xs">
                <span className="text-[#14161C]/70">{payment.description}</span>
                <span className="font-semibold text-[#D4A94F]">{fmt(sanitizeNumeric(payment.amount))}</span>
              </div>
            ))}
            {linkedPayments.length > 2 && (
              <p className="text-xs text-[#14161C]/50">
                +{linkedPayments.length - 2} more payments
              </p>
            )}
          </div>
        </div>
      )}

      {line.notes && (
        <div className="pt-3 border-t border-[#1F4D3A]/8 mt-3">
          <p className="text-xs text-[#14161C]/60">{line.notes}</p>
        </div>
      )}
    </div>
  )
}

const BUDGET_CATEGORIES = [
  'VENUE', 'CATERING', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'MUSIC', 
  'FLOWERS', 'DECORATION', 'ATTIRE', 'TRANSPORT', 'ACCOMMODATION',
  'DOCUMENTATION', 'GIFTS', 'MISCELLANEOUS'
]

export function BudgetClient({ 
  weddingId, 
  eventId, 
  eventName, 
  initialBudgetLines, 
  initialPayments 
}: Readonly<BudgetClientProps>) {
  const [budgetLines] = useState<BudgetLine[]>(initialBudgetLines)
  const [payments] = useState<Payment[]>(initialPayments)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter budget lines
  const filteredBudgetLines = useMemo(() => {
    let filtered = budgetLines

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(line => line.category === categoryFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(line =>
        line.description.toLowerCase().includes(query) ||
        line.category.toLowerCase().includes(query) ||
        line.notes?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [budgetLines, categoryFilter, searchQuery])

  // Budget statistics
  const stats = useMemo(() => {
    const summary = calculateBudgetSummary(budgetLines)
    return {
      ...summary,
      lineCount: budgetLines.length
    }
  }, [budgetLines])

  // Group budget lines by category for display
  const budgetByCategory = useMemo(() => {
    return groupBudgetByCategory(filteredBudgetLines)
  }, [filteredBudgetLines])

  const fmt = (amount: number) => formatCurrency(amount)

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-[#14161C] mb-2">
              Budget for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Track estimated vs actual costs for your event
            </p>
          </div>
          <Button onClick={() => console.log('Add budget line functionality to be implemented')}>
            <Plus size={16} />
            Add Budget Line
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Estimated
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">
              {fmt(sanitizeNumeric(stats.totalEstimated))}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-[#D4A94F]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Actual
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#D4A94F]">
              {fmt(sanitizeNumeric(stats.totalActual))}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              {stats.variance >= 0 ? (
                <TrendingUp size={16} className="text-[#14161C]/60" />
              ) : (
                <TrendingDown size={16} className="text-[#1F4D3A]" />
              )}
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Variance
              </span>
            </div>
            <p className={cn(
              'text-2xl font-heading font-bold',
              stats.variance >= 0 ? 'text-[#14161C]/60' : 'text-[#1F4D3A]'
            )}>
              {stats.variance >= 0 ? '+' : ''}{fmt(sanitizeNumeric(stats.variance))}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Utilization
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#1F4D3A]">
              {sanitizeNumeric(stats.utilizationPercentage).toFixed(0)}%
            </p>
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
                placeholder="Search budget lines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {BUDGET_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Budget Lines by Category */}
      {budgetByCategory.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={40} className="text-[#1F4D3A]/40" />}
          title={budgetLines.length === 0 ? "No budget lines yet" : "No budget lines match your filters"}
          description={
            budgetLines.length === 0 
              ? "Start by adding budget lines to track your event expenses."
              : "Try adjusting your search or filter criteria."
          }
          action={
            budgetLines.length === 0 ? (
              <Button onClick={() => console.log('Add budget line functionality to be implemented')}>
                <Plus size={16} />
                Add Your First Budget Line
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {budgetByCategory.map(({ category, lines, totalEstimated, totalActual }) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-[#14161C]">
                  {category}
                </h3>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#14161C]">
                    {fmt(sanitizeNumeric(totalActual))} / {fmt(sanitizeNumeric(totalEstimated))}
                  </p>
                  <p className="text-xs text-[#14161C]/60">
                    {lines.length} line{lines.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {lines.map(line => (
                  <BudgetLineCard key={line.id} line={line} payments={payments} fmt={fmt} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}