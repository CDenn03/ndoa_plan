'use client'
import { use } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Badge, Button, Spinner } from '@/components/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'

interface RiskAlert {
  id: string; severity: string; category: string; message: string; isResolved: boolean
}

const SEV_BADGE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
}
const SEV_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-400', HIGH: 'bg-orange-400', MEDIUM: 'bg-sky-400', LOW: 'bg-emerald-400',
}

export default function RisksPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery<{ active: RiskAlert[], resolved: RiskAlert[] }>({
    queryKey: ['risks', wid],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/risks`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const active = data?.active ?? []
  const resolved = (data?.resolved ?? []).slice(0, 10)

  const resolve = async (riskId: string) => {
    try {
      await fetch(`/api/weddings/${wid}/risks/${riskId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: true }),
      })
      qc.invalidateQueries({ queryKey: ['risks', wid] })
      toast('Risk marked as resolved', 'success')
    } catch { toast('Failed to resolve risk', 'error') }
  }

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-[#1F4D3A]/8 bg-white">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-[#1F4D3A]/40 uppercase tracking-widest mb-2">Monitoring</p>
          <h1 className="text-4xl font-heading font-semibold text-[#14161C] tracking-tight">Risk Alerts</h1>
          <p className="text-sm text-[#14161C]/40 mt-2">{active.length} active · {resolved.length} resolved</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-[#14161C]">All clear</h2>
            <p className="text-sm text-[#14161C]/40 mt-1.5">No active risk alerts. Risk rules run automatically.</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-5">Active</p>
            <div className="space-y-0">
              {active.map(r => (
                <div key={r.id} className="group flex items-start gap-4 py-4 border-b border-[#1F4D3A]/8 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${SEV_DOT[r.severity] ?? 'bg-zinc-300'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={SEV_BADGE[r.severity]}>{r.severity}</Badge>
                      <span className="text-xs text-[#14161C]/40 font-medium">{r.category}</span>
                    </div>
                    <p className="text-sm text-[#14161C]/70 leading-relaxed">{r.message}</p>
                  </div>
                  <Button size="sm" variant="secondary"
                    className=" flex-shrink-0"
                    onClick={() => resolve(r.id)}>
                    <CheckCircle2 size={13} /> Mark as Resolved
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#1F4D3A]/40 uppercase tracking-widest mb-5">Recently resolved</p>
            <div className="space-y-0">
              {resolved.map(r => (
                <div key={r.id} className="flex items-start gap-4 py-4 border-b border-[#1F4D3A]/8 last:border-0 opacity-50">
                  <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#14161C]/55 line-through leading-relaxed">{r.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
