import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui'

const SEV_BADGE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low',
}

export default async function RisksPage({ params }: { params: { weddingId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const wid = params.weddingId
  const [active, resolved] = await Promise.all([
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: false }, orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }] }),
    db.riskAlert.findMany({ where: { weddingId: wid, isResolved: true }, orderBy: { resolvedAt: 'desc' }, take: 10 }),
  ])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">Risk Alerts</h1>
        <p className="text-sm text-zinc-500">{active.length} active · {resolved.length} resolved</p>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <CheckCircle2 size={40} className="text-green-400 mb-3" />
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">All clear</h2>
          <p className="text-sm text-zinc-400 mt-1">No active risk alerts. Risk rules run automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Active</h2>
          {active.map(r => (
            <div key={r.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className={r.severity === 'CRITICAL' ? 'text-red-500' : r.severity === 'HIGH' ? 'text-orange-500' : 'text-blue-500'} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={SEV_BADGE[r.severity]}>{r.severity}</Badge>
                  <span className="text-xs text-zinc-400">{r.category}</span>
                </div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Recently resolved</h2>
          {resolved.map(r => (
            <div key={r.id} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 flex items-start gap-3 opacity-60">
              <CheckCircle2 size={18} className="text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-through">{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
