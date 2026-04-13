'use client'
import { v4 as uuidv4 } from 'uuid'
import { weddingDB } from '../db/dexie'
import { computeChecksum } from '../db/checksum'
import { resolveConflict } from './conflict-resolver'
import type { SyncOperation, OpType, EntityType, SyncBatchRequest, SyncBatchResponse, SyncOperationResult } from '@/types'

const BATCH_SIZE = 10
const IN_FLIGHT_TIMEOUT_MS = 30_000
const CIRCUIT_BREAK_THRESHOLD = 5
const PRUNE_AFTER_MS = 72 * 60 * 60 * 1000
// Half-open probe: after circuit opens, attempt a single probe after this delay.
// Each failed probe doubles the cooldown up to 5 minutes.
const CIRCUIT_BASE_PROBE_MS = 30_000

function backoffMs(n: number): number {
  const expo = Math.min(2000 * Math.pow(2, n), 300_000)
  return expo + Math.random() * expo * 0.3
}

let consecutiveFailures = 0
let circuitOpen = false
let probeTimeout: ReturnType<typeof setTimeout> | null = null
let probeAttempts = 0

function scheduleProbe(weddingId: string): void {
  if (probeTimeout) return
  const delay = Math.min(CIRCUIT_BASE_PROBE_MS * Math.pow(2, probeAttempts), 300_000)
  probeTimeout = setTimeout(async () => {
    probeTimeout = null
    // Half-open: try one real flush; recordSuccess/recordFailure will handle state
    try {
      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId, operations: [], clientTimestamp: Date.now() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      probeAttempts = 0
      recordSuccess()
    } catch {
      probeAttempts++
      scheduleProbe(weddingId)
    }
  }, delay)
}

function recordSuccess() {
  consecutiveFailures = 0
  probeAttempts = 0
  if (probeTimeout) { clearTimeout(probeTimeout); probeTimeout = null }
  if (circuitOpen) { circuitOpen = false; window.dispatchEvent(new CustomEvent('sync:circuit-closed')) }
}

function recordFailure(weddingId?: string) {
  consecutiveFailures++
  if (consecutiveFailures >= CIRCUIT_BREAK_THRESHOLD && !circuitOpen) {
    circuitOpen = true
    window.dispatchEvent(new CustomEvent('sync:circuit-open'))
    if (weddingId) scheduleProbe(weddingId)
  }
}

export async function enqueue(
  entityType: EntityType, entityId: string, operation: OpType,
  payload: Record<string, unknown>,
  opts: { priority?: 1|2|3; clientVersion?: number } = {}
): Promise<string> {
  const operationId = uuidv4()
  const priority = opts.priority ?? defaultPriority(entityType, operation)
  await weddingDB.syncQueue.add({
    operationId, entityType, entityId, operation,
    payload: { ...payload, clientVersion: opts.clientVersion ?? 0, checksum: computeChecksum(payload) },
    clientVersion: opts.clientVersion ?? 0,
    priority, status: 'pending',
    createdAt: Date.now(), attemptCount: 0,
  })
  return operationId
}

function defaultPriority(e: EntityType, op: OpType): 1|2|3 {
  if (op === 'PAY' || op === 'RSVP' || op === 'CHECKIN') return 1
  if (e === 'payment' || e === 'committee_contribution') return 1
  if (e === 'vendor' || e === 'guest') return 2
  return 3
}

export async function resetStaleInFlightOps(): Promise<void> {
  const cutoff = Date.now() - IN_FLIGHT_TIMEOUT_MS
  await weddingDB.syncQueue.where('status').equals('in_flight')
    .filter(op => (op.lastAttemptAt ?? 0) < cutoff)
    .modify((op: SyncOperation) => { op.status = 'pending'; op.attemptCount = (op.attemptCount ?? 0) + 1 })
}

export async function pruneSyncedOps(): Promise<void> {
  const cutoff = Date.now() - PRUNE_AFTER_MS
  await weddingDB.syncQueue.where('status').equals('synced')
    .filter(op => (op.lastAttemptAt ?? op.createdAt) < cutoff).delete()
}

export async function flushBatch(weddingId: string): Promise<number> {
  if (circuitOpen || !navigator.onLine) return 0
  await resetStaleInFlightOps()

  const all = await weddingDB.syncQueue.where('status').equals('pending').sortBy('priority')
  const ops = all.filter(op => {
    if (op.attemptCount === 0) return true
    return Date.now() - (op.lastAttemptAt ?? 0) >= backoffMs(op.attemptCount - 1)
  }).slice(0, BATCH_SIZE)

  if (!ops.length) return 0
  const opIds = ops.map(o => o.operationId)
  await weddingDB.syncQueue.where('operationId').anyOf(opIds)
    .modify({ status: 'in_flight', lastAttemptAt: Date.now() })

  let response: SyncBatchResponse
  try {
    const res = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId, operations: ops, clientTimestamp: Date.now() } as SyncBatchRequest),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    response = await res.json()
    recordSuccess()
  } catch {
    await weddingDB.syncQueue.where('operationId').anyOf(opIds)
      .modify((op: SyncOperation) => { op.status = 'pending'; op.attemptCount = (op.attemptCount ?? 0) + 1; op.lastAttemptAt = Date.now() })
    recordFailure(weddingId)
    return 0
  }

  let successCount = 0
  for (const result of response.results) {
    await processResult(result)
    if (result.status === 'ok' || result.status === 'duplicate') successCount++
  }
  return successCount
}

async function processResult(result: SyncOperationResult): Promise<void> {
  if (result.status === 'ok' || result.status === 'duplicate') {
    await weddingDB.syncQueue.where('operationId').equals(result.operationId)
      .modify({ status: 'synced', serverAck: result.operationId, lastAttemptAt: Date.now() })
    if (result.serverId) {
      const op = await weddingDB.syncQueue.where('operationId').equals(result.operationId).first()
      if (op) {
        const tbl = weddingDB.table(op.entityType.replace('_', '') + 's')
        if (tbl) await tbl.where('id').equals(op.entityId)
          .modify({ serverId: result.serverId, version: result.serverVersion ?? 1, syncedAt: Date.now(), isDirty: false })
      }
    }
  } else if (result.status === 'conflict' && result.conflict) {
    const resolved = resolveConflict(result.conflict)
    if (resolved.needsHumanReview) {
      await weddingDB.syncConflicts.add({ operationId: result.operationId, entityType: result.conflict.entityType, entityId: result.conflict.entityId, conflict: { ...result.conflict, resolution: resolved.resolution }, resolved: false, createdAt: Date.now() })
      await weddingDB.syncQueue.where('operationId').equals(result.operationId).modify({ status: 'conflict', conflictData: result.conflict })
      window.dispatchEvent(new CustomEvent('sync:conflict', { detail: { conflict: result.conflict, summary: resolved.summary } }))
    } else {
      const tableMap: Record<string, string> = { guest: 'guests', vendor: 'vendors', checklist_item: 'checklistItems', budget_line: 'budgetLines', payment: 'payments' }
      const tbl = weddingDB.table(tableMap[result.conflict.entityType] ?? '')
      if (tbl) await tbl.where('id').equals(result.conflict.entityId)
        .modify({ ...resolved.mergedState, version: result.conflict.serverVersion, syncedAt: Date.now(), isDirty: false })
      await weddingDB.syncQueue.where('operationId').equals(result.operationId).modify({ status: 'synced' })
    }
  } else if (result.status === 'error') {
    await weddingDB.syncQueue.where('operationId').equals(result.operationId)
      .modify((op: SyncOperation) => { op.status = 'failed'; op.attemptCount = (op.attemptCount ?? 0) + 1; op.lastAttemptAt = Date.now() })
  }
}

let _interval: ReturnType<typeof setInterval> | null = null

export function startSyncWorker(weddingId: string, ms = 15_000): void {
  if (_interval) return
  const run = async () => { try { await flushBatch(weddingId); await pruneSyncedOps() } catch (_) {} }
  run()
  _interval = setInterval(run, ms)
  window.addEventListener('online', run)
}

export function stopSyncWorker(): void {
  if (_interval) { clearInterval(_interval); _interval = null }
  if (probeTimeout) { clearTimeout(probeTimeout); probeTimeout = null }
}

export function getSyncCircuitOpen(): boolean { return circuitOpen }
