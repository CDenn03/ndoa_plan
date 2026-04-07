'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { startSyncWorker, stopSyncWorker } from '@/lib/sync/engine'
import { reconcileCache } from '@/hooks/use-atomic-write'
import { weddingDB } from '@/lib/db/dexie'
import { useWeddingStore } from '@/store/wedding-store'
import type { ConflictPayload } from '@/types'

interface SyncCtx {
  isOnline: boolean
  circuitOpen: boolean
  pendingConflicts: ConflictPayload[]
  dismissConflict: (id: string) => void
}

const SyncContext = createContext<SyncCtx>({ isOnline: true, circuitOpen: false, pendingConflicts: [], dismissConflict: () => {} })

export function SyncProvider({ weddingId, children }: { weddingId: string; children: ReactNode }) {
  const qc = useQueryClient()
  const setOffline = useWeddingStore(s => s.setIsOffline)
  const setCircuit = useWeddingStore(s => s.setSyncCircuitOpen)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [circuitOpen, setCircuitOpen] = useState(false)
  const [pendingConflicts, setPendingConflicts] = useState<ConflictPayload[]>([])
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    startSyncWorker(weddingId)
    return () => stopSyncWorker()
  }, [weddingId])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true); setOffline(false)
      reconcileCache(qc, ['guests', weddingId], weddingDB.guests, weddingId)
      reconcileCache(qc, ['vendors', weddingId], weddingDB.vendors, weddingId)
    }
    const onOffline = () => { setIsOnline(false); setOffline(true) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [weddingId, qc, setOffline])

  useEffect(() => {
    const onOpen = () => { setCircuitOpen(true); setCircuit(true) }
    const onClose = () => { setCircuitOpen(false); setCircuit(false) }
    const onConflict = (e: Event) => {
      const { conflict } = (e as CustomEvent).detail
      setPendingConflicts(p => [...p, conflict])
      qc.invalidateQueries({ queryKey: [conflict.entityType.replace('_', '') + 's', weddingId] })
    }
    window.addEventListener('sync:circuit-open', onOpen)
    window.addEventListener('sync:circuit-closed', onClose)
    window.addEventListener('sync:conflict', onConflict)
    return () => {
      window.removeEventListener('sync:circuit-open', onOpen)
      window.removeEventListener('sync:circuit-closed', onClose)
      window.removeEventListener('sync:conflict', onConflict)
    }
  }, [weddingId, qc, setCircuit])

  useEffect(() => {
    const onFocus = () => {
      reconcileCache(qc, ['guests', weddingId], weddingDB.guests, weddingId)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [weddingId, qc])

  const dismissConflict = (id: string) => setPendingConflicts(p => p.filter(c => c.operationId !== id))

  return (
    <SyncContext.Provider value={{ isOnline, circuitOpen, pendingConflicts, dismissConflict }}>
      {!isOnline && (
        <div className="sticky top-0 z-50 bg-amber-600 text-white text-sm font-medium py-2 px-4 text-center">
          Offline — changes saved locally and will sync when connected
        </div>
      )}
      {circuitOpen && isOnline && (
        <div className="sticky top-0 z-50 bg-red-700 text-white text-sm font-medium py-2 px-4 text-center flex items-center justify-center gap-3">
          Sync paused after repeated failures. Data is safe locally.
          <button onClick={() => window.location.reload()} className="border border-white/50 rounded px-2 py-0.5 text-xs hover:bg-white/10">
            Retry
          </button>
        </div>
      )}
      {pendingConflicts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
          {pendingConflicts.map(c => (
            <div key={c.operationId} className="bg-white dark:bg-zinc-900 border border-amber-300 border-l-4 border-l-amber-500 rounded-r-xl p-3 shadow-lg">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Edit conflict</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {c.entityType} edited on two devices. Server version kept.
              </p>
              <button onClick={() => dismissConflict(c.operationId)} className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-0.5">
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
      {children}
    </SyncContext.Provider>
  )
}

export const useSync = () => useContext(SyncContext)
