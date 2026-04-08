import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui'

const SEV_BADGE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
}

const SEV_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-400', HIGH: 'bg-orange-400', MEDIUM: 'bg-sky-400', LOW: 'bg-emerald-400',
}

export default async function RisksPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId
  const [active, resolved] = await Promise.all([
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: false }, orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }] }),
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: true }, orderBy: { resolvedAt: 'desc' }, take: 10 }),
  ])

  return (
    <div className="min-h-full">
      <div className="px-8 pt-10 pb-8 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Monitoring</p>
          <h1 className="text-4xl font-extrabold text-[#14161C] tracking-tight">Risk Alerts</h1>
          <p className="text-sm text-zinc-400 mt-2">{active.length} active · {resolved.length} resolved</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
        {active.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-[#14161C]">All clear</h2>
            <p className="text-sm text-zinc-400 mt-1.5">No active risk alerts. Risk rules run automatically.</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">Active</p>
            <div className="space-y-0">
              {active.map(r => (
                <div key={r.id} className="flex items-start gap-4 py-4 border-b border-zinc-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${SEV_DOT[r.severity] ?? 'bg-zinc-300'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={SEV_BADGE[r.severity]}>{r.severity}</Badge>
                      <span className="text-xs text-zinc-400 font-medium">{r.category}</span>
                    </div>
                    <p className="text-sm text-zinc-700 leading-relaxed">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">Recently resolved</p>
            <div className="space-y-0">
              {resolved.map(r => (
                <div key={r.id} className="flex items-start gap-4 py-4 border-b border-zinc-100 last:border-0 opacity-50">
                  <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-zinc-500 line-through leading-relaxed">{r.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
