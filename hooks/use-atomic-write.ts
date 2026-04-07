'use client'
import { useQueryClient } from '@tanstack/react-query'
import { weddingDB } from '@/lib/db/dexie'
import { computeChecksum } from '@/lib/db/checksum'
import { enqueue } from '@/lib/sync/engine'
import type { EntityType, OpType } from '@/types'

export async function atomicWrite<T extends { id: string }>(
  qc: ReturnType<typeof useQueryClient>,
  opts: {
    table: ReturnType<typeof weddingDB.table>
    queryKey: unknown[]
    data: T
    operation: 'add' | 'put'
    entityType: EntityType
    syncOp: OpType
    priority?: 1 | 2 | 3
    clientVersion?: number
  }
): Promise<{ ok: boolean; storageWarning?: string; error?: Error }> {
  let dexieOk = false
  try {
    if (opts.operation === 'add') await opts.table.add(opts.data)
    else await opts.table.put(opts.data)
    dexieOk = true
  } catch (err) {
    const isQuota = err instanceof Error && (err.name === 'QuotaExceededError' || err.message.includes('quota'))
    if (isQuota && !navigator.onLine) return { ok: false, error: new Error('Device storage is full and you are offline.') }
    if (isQuota) return { ok: false, storageWarning: 'Local storage full. Changes saved to server only.', error: err as Error }
    if (!navigator.onLine) return { ok: false, error: err as Error }
    console.warn('[atomicWrite] Dexie unavailable, degraded mode', err)
  }

  if (dexieOk) {
    qc.setQueryData(opts.queryKey, (old: T[] | undefined) => {
      if (!old) return [opts.data]
      const i = old.findIndex(x => x.id === opts.data.id)
      if (i === -1) return [...old, opts.data]
      const n = [...old]; n[i] = opts.data; return n
    })
    try {
      await enqueue(opts.entityType, opts.data.id, opts.syncOp,
        opts.data as unknown as Record<string, unknown>,
        { priority: opts.priority, clientVersion: opts.clientVersion })
    } catch (e) { console.error('[atomicWrite] enqueue failed', e) }
  }
  return { ok: dexieOk }
}

export async function reconcileCache<T extends { id: string; checksum?: string }>(
  qc: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  table: ReturnType<typeof weddingDB.table>,
  weddingId: string
): Promise<void> {
  const cached = qc.getQueryData<T[]>(queryKey)
  if (!cached) return
  const local = await table.where('weddingId').equals(weddingId).toArray() as T[]
  const localMap = new Map(local.map(g => [g.id, g]))
  let diverged = false
  const reconciled = cached.map(c => {
    const d = localMap.get(c.id)
    if (!d || c.checksum === d.checksum) return c
    diverged = true; return d
  })
  if (diverged) qc.setQueryData(queryKey, reconciled)
}
