import Dexie, { type Table } from 'dexie'
import type {
  LocalGuest,
  LocalVendor,
  LocalTimelineEvent,
  LocalChecklistItem,
  LocalBudgetLine,
  SyncOperation,
  ConflictPayload,
} from '@/types'

export interface SyncConflictRow {
  id?: number
  operationId: string
  entityType: string
  entityId: string
  conflict: ConflictPayload
  resolved: boolean
  createdAt: number
}

export interface WeddingCacheRow {
  id: string
  name: string
  date: number
  venue?: string
  venueCapacity?: number
  budget: number
  currency: string
  themeColor: string
  themeAccent: string
  coverImagePath?: string
  updatedAt: number
}

class WeddingDB extends Dexie {
  guests!: Table<LocalGuest>
  vendors!: Table<LocalVendor>
  timelineEvents!: Table<LocalTimelineEvent>
  checklistItems!: Table<LocalChecklistItem>
  budgetLines!: Table<LocalBudgetLine>
  syncQueue!: Table<SyncOperation>
  syncConflicts!: Table<SyncConflictRow>
  weddingCache!: Table<WeddingCacheRow>

  constructor() {
    super('WeddingPlatformDB')

    this.version(1).stores({
      guests:
        'id, weddingId, rsvpStatus, tableNumber, committeeId, checkedIn, isDirty, updatedAt, syncedAt',
      vendors:
        'id, weddingId, status, category, lastContactAt, isDirty, updatedAt, syncedAt',
      timelineEvents:
        'id, weddingId, startTime, assignedUserId, vendorId, isDirty, updatedAt, syncedAt',
      checklistItems:
        'id, weddingId, isChecked, dueDate, category, priority, isDirty, updatedAt, syncedAt',
      budgetLines:
        'id, weddingId, category, isDirty, updatedAt, syncedAt',
      syncQueue:
        '++localId, operationId, entityType, entityId, status, priority, createdAt, attemptCount',
      syncConflicts:
        '++id, operationId, entityId, resolved, createdAt',
      weddingCache:
        'id, updatedAt',
    })

    // Safe migration: v2 adds tags[] to guests
    this.version(2)
      .stores({
        guests:
          'id, weddingId, rsvpStatus, tableNumber, committeeId, checkedIn, isDirty, updatedAt, syncedAt',
        vendors:
          'id, weddingId, status, category, lastContactAt, isDirty, updatedAt, syncedAt',
        timelineEvents:
          'id, weddingId, startTime, assignedUserId, vendorId, isDirty, updatedAt, syncedAt',
        checklistItems:
          'id, weddingId, isChecked, dueDate, category, priority, isDirty, updatedAt, syncedAt',
        budgetLines:
          'id, weddingId, category, isDirty, updatedAt, syncedAt',
        syncQueue:
          '++localId, operationId, entityType, entityId, status, priority, createdAt, attemptCount',
        syncConflicts:
          '++id, operationId, entityId, resolved, createdAt',
        weddingCache:
          'id, updatedAt',
      })
      .upgrade(tx => {
        return tx.table('guests').toCollection().modify((g: LocalGuest) => {
          if (!g.tags) g.tags = []
          if (g.checkedIn === undefined) g.checkedIn = false
        })
      })

    // Schema validation on open
    this.on('ready', async () => {
      try {
        await Promise.all([
          this.guests.limit(1).toArray(),
          this.syncQueue.limit(1).toArray(),
        ])
      } catch (err) {
        console.error('[WeddingDB] Schema validation failed, backing up queue', err)
        try {
          const queue = await this.syncQueue.toArray()
          localStorage.setItem(
            'wedding_sync_queue_backup',
            JSON.stringify({ backed_up_at: Date.now(), operations: queue })
          )
        } catch (_) { /* localStorage unavailable */ }
        try {
          await this.delete()
          await this.open()
        } catch (reopenErr) {
          console.error('[WeddingDB] Failed to reopen after delete', reopenErr)
        }
      }
    })
  }
}

const globalForDexie = globalThis as unknown as { weddingDB: WeddingDB | undefined }

export const weddingDB =
  typeof window !== 'undefined'
    ? (globalForDexie.weddingDB ?? (globalForDexie.weddingDB = new WeddingDB()))
    : (null as unknown as WeddingDB)
