'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  weddingId: string
  eventId?: string
  vendorId?: string
  contributionId?: string
  mpesaRef?: string
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'DUPLICATE' | 'DISPUTED' | 'REFUNDED'
  payerName?: string
  payerPhone?: string
  description?: string
  processedAt?: string
  reconciledAt?: string
  createdAt: string
}

export interface Contribution {
  id: string
  weddingId: string
  memberId?: string
  memberName: string
  pledgeAmount: number
  paidAmount: number
  pledgeDate: string
  dueDate?: string
  status: 'PLEDGED' | 'PARTIAL' | 'FULFILLED' | 'OVERDUE' | 'CANCELLED'
  notes?: string
  eventId?: string
}

export interface InitiatePaymentArgs {
  weddingId: string
  phone: string
  amount: number
  description?: string
  vendorId?: string
  contributionId?: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayments(weddingId: string) {
  return useQuery({
    queryKey: ['payments', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/payments`)
      if (!res.ok) throw new Error('Failed to load payments')
      return res.json() as Promise<Payment[]>
    },
    staleTime: 60_000,
  })
}

export function useContributions(weddingId: string) {
  return useQuery({
    queryKey: ['contributions', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/contributions`)
      if (!res.ok) throw new Error('Failed to load contributions')
      return res.json() as Promise<Contribution[]>
    },
    staleTime: 30_000,
  })
}

export function useInitiatePayment(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: InitiatePaymentArgs) => {
      const res = await fetch('/api/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Payment initiation failed')
      }
      return res.json() as Promise<{ paymentId: string; checkoutRequestId: string }>
    },
    onSuccess: () => {
      // Invalidate to pick up new PENDING payment
      qc.invalidateQueries({ queryKey: ['payments', weddingId] })
    },
  })
}

export function useAddContribution(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<Contribution, 'id' | 'weddingId' | 'paidAmount' | 'pledgeDate'>) => {
      const res = await fetch(`/api/weddings/${weddingId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, weddingId }),
      })
      if (!res.ok) throw new Error('Failed to add contribution')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contributions', weddingId] }),
  })
}
export function usePaymentSummary(weddingId: string) {
  const { data: payments = [] } = usePayments(weddingId)
  const { data: contributions = [] } = useContributions(weddingId)

  const completed = payments.filter(p => p.status === 'COMPLETED')
  const totalReceived = completed.reduce((s, p) => s + p.amount, 0)
  const totalPledged = contributions.reduce((s, c) => s + c.pledgeAmount, 0)
  const totalContributed = contributions.reduce((s, c) => s + c.paidAmount, 0)
  const overdue = contributions.filter(c => c.status === 'OVERDUE').length
  const disputed = payments.filter(p => p.status === 'DISPUTED').length

  return {
    totalReceived,
    totalPledged,
    totalContributed,
    overdue,
    disputed,
    pendingPayments: payments.filter(p => p.status === 'PENDING').length,
    completedPayments: completed.length,
  }
}
