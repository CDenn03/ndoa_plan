'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface RiskAlert {
  id: string
  weddingId: string
  ruleId: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  message: string
  data?: Record<string, unknown>
  isResolved: boolean
  resolvedAt?: string
  createdAt: string
}

export function useRiskAlerts(weddingId: string) {
  return useQuery({
    queryKey: ['risks', weddingId],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/risks`)
      if (!res.ok) throw new Error('Failed to load risks')
      return res.json() as Promise<{ active: RiskAlert[]; resolved: RiskAlert[] }>
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // re-check every 5min
  })
}

export function useResolveRisk(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (riskId: string) => {
      const res = await fetch(`/api/weddings/${weddingId}/risks/${riskId}/resolve`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to resolve risk')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', weddingId] }),
  })
}

export function useEvaluateRisks(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/weddings/${weddingId}/evaluate-risks`, { method: 'POST' })
      if (!res.ok) throw new Error('Evaluation failed')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', weddingId] }),
  })
}
