'use client'
import { useState, useMemo } from 'react'
import { 
  Wallet, Plus, CheckCircle, Clock, 
  Filter, Search, CreditCard, AlertTriangle,
  DollarSign, Calendar, ExternalLink
} from 'lucide-react'
import { Button, Input, Select, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/components/ui'
import { format } from 'date-fns'

interface BudgetLine {
  id: string
  description: string
  category: string
}

interface Payment {
  id: string
  amount: number
  description: string
  paymentDate: string
  status: string
  method: string
  mpesaRef?: string | null
  budgetLineId?: string | null
  budgetLine?: BudgetLine | null
  createdAt: string
}

interface OutstandingBudgetLine {
  id: string
  description: string
  category: string
  estimated: number
  actual: number
}

interface PaymentsClientProps {
  weddingId: string
  eventId: string
  eventName: string
  initialPayments: Payment[]
  outstandingBudgetLines: OutstandingBudgetLine[]
}

const STATUS_COLORS = {
  COMPLETED: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  PENDING: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  FAILED: 'bg-[#14161C]/10 text-[#14161C]',
  CANCELLED: 'bg-[#14161C]/10 text-[#14161C]'
}

const METHOD_COLORS = {
  MPESA: 'bg-[#1F4D3A]/10 text-[#1F4D3A]',
  BANK: 'bg-[#D4A94F]/10 text-[#D4A94F]',
  CASH: 'bg-[#14161C]/10 text-[#14161C]',
  CARD: 'bg-[#1F4D3A]/10 text-[#1F4D3A]'
}

export function PaymentsClient({ 
  weddingId, 
  eventId, 
  eventName, 
  initialPayments,
  outstandingBudgetLines
}: Readonly<PaymentsClientProps>) {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showQuickPay, setShowQuickPay] = useState<string | null>(null)

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = payments

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }

    // Apply method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.method === methodFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(payment =>
        payment.description.toLowerCase().includes(query) ||
        payment.budgetLine?.description.toLowerCase().includes(query) ||
        payment.mpesaRef?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [payments, statusFilter, methodFilter, searchQuery])

  // Payment statistics
  const stats = useMemo(() => {
    const total = payments.length
    const completed = payments.filter(p => p.status === 'COMPLETED').length
    const pending = payments.filter(p => p.status === 'PENDING').length
    const totalAmount = payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0)

    return { total, completed, pending, totalAmount }
  }, [payments])

  const handleQuickPay = async (budgetLineId: string, amount: number) => {
    try {
      const res = await fetch(`/api/weddings/${weddingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetLineId,
          amount,
          method: 'MPESA',
          description: `Payment for ${outstandingBudgetLines.find(bl => bl.id === budgetLineId)?.description}`,
          paymentDate: new Date().toISOString().split('T')[0]
        })
      })

      if (!res.ok) throw new Error('Failed to create payment')

      const newPayment = await res.json()
      setPayments(prev => [newPayment, ...prev])
      setShowQuickPay(null)
      toast('Payment recorded', 'success')
    } catch {
      toast('Failed to record payment', 'error')
    }
  }

  const fmt = (amount: number) => 
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount)

  const PaymentCard = ({ payment }: { payment: Payment }) => {
    return (
      <div className="p-4 bg-white rounded-xl border border-[#1F4D3A]/8 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#1F4D3A]/5 rounded-xl flex items-center justify-center">
                <Wallet size={16} className="text-[#1F4D3A]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#14161C]">{payment.description}</h3>
                <p className="text-lg font-heading font-bold text-[#D4A94F]">
                  {fmt(payment.amount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge className={STATUS_COLORS[payment.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700'}>
                {payment.status}
              </Badge>
              <Badge className={METHOD_COLORS[payment.method as keyof typeof METHOD_COLORS] || 'bg-gray-100 text-gray-700'}>
                {payment.method}
              </Badge>
              {payment.budgetLine && (
                <span className="text-xs px-2 py-1 bg-[#1F4D3A]/10 text-[#1F4D3A] rounded-full">
                  {payment.budgetLine.category}
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs text-[#14161C]/60">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
              </div>
              
              {payment.budgetLine && (
                <p>Budget: {payment.budgetLine.description}</p>
              )}
              
              {payment.mpesaRef && (
                <div className="flex items-center gap-1">
                  <CreditCard size={12} />
                  M-Pesa: {payment.mpesaRef}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {payment.status === 'COMPLETED' && (
              <CheckCircle size={16} className="text-[#1F4D3A]" />
            )}
            {payment.status === 'PENDING' && (
              <Clock size={16} className="text-[#D4A94F]" />
            )}
            {payment.status === 'FAILED' && (
              <AlertTriangle size={16} className="text-[#14161C]/60" />
            )}
          </div>
        </div>
      </div>
    )
  }

  const OutstandingCard = ({ budgetLine }: { budgetLine: OutstandingBudgetLine }) => {
    const remaining = budgetLine.estimated - budgetLine.actual

    return (
      <div className="p-4 bg-white rounded-xl border border-[#D4A94F]/20 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-[#14161C] mb-1">{budgetLine.description}</h3>
            <p className="text-sm text-[#14161C]/60 mb-2">{budgetLine.category}</p>
            
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-[#14161C]/50">Paid: </span>
                <span className="font-semibold text-[#1F4D3A]">{fmt(budgetLine.actual)}</span>
              </div>
              <div>
                <span className="text-[#14161C]/50">Remaining: </span>
                <span className="font-semibold text-[#D4A94F]">{fmt(remaining)}</span>
              </div>
            </div>
          </div>

          <Button 
            size="sm"
            onClick={() => setShowQuickPay(budgetLine.id)}
            className="ml-4"
          >
            <Wallet size={12} />
            Pay
          </Button>
        </div>

        {showQuickPay === budgetLine.id && (
          <div className="pt-3 border-t border-[#D4A94F]/20">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleQuickPay(budgetLine.id, remaining)}
                className="flex-1"
              >
                Pay Full Amount ({fmt(remaining)})
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAddPayment(true)}
                className="flex-1"
              >
                Custom Amount
              </Button>
            </div>
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
              Payments for {eventName}
            </h2>
            <p className="text-[#14161C]/60">
              Track and manage payments for this event
            </p>
          </div>
          <Button onClick={() => setShowAddPayment(true)}>
            <Plus size={16} />
            Record Payment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Total
              </span>
            </div>
            <p className="text-2xl font-heading font-bold text-[#14161C]">{stats.total}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#1F4D3A]/8">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-[#1F4D3A]" />
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
              <DollarSign size={16} className="text-[#1F4D3A]" />
              <span className="text-xs font-semibold text-[#14161C]/60 uppercase tracking-wide">
                Total Paid
              </span>
            </div>
            <p className="text-lg font-heading font-bold text-[#1F4D3A]">
              {fmt(stats.totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Outstanding Items */}
      {outstandingBudgetLines.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-heading font-semibold text-[#14161C] mb-4">
            Outstanding Items ({outstandingBudgetLines.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {outstandingBudgetLines.slice(0, 4).map(budgetLine => (
              <OutstandingCard key={budgetLine.id} budgetLine={budgetLine} />
            ))}
          </div>
          {outstandingBudgetLines.length > 4 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                View All Outstanding Items ({outstandingBudgetLines.length - 4} more)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl border border-[#1F4D3A]/8 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#14161C]/40" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>

            <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="all">All Methods</option>
              <option value="MPESA">M-Pesa</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={40} className="text-[#1F4D3A]/40" />}
          title={payments.length === 0 ? "No payments yet" : "No payments match your filters"}
          description={
            payments.length === 0 
              ? "Start recording payments for this event to track your expenses."
              : "Try adjusting your search or filter criteria."
          }
          action={
            payments.length === 0 ? (
              <Button onClick={() => setShowAddPayment(true)}>
                <Plus size={16} />
                Record Your First Payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPayments.map(payment => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  )
}