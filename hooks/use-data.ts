'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { weddingDB } from '@/lib/db/dexie'
import { computeChecksum } from '@/lib/db/checksum'
import { atomicWrite } from './use-atomic-write'
import { v4 as uuidv4 } from 'uuid'
import type { LocalChecklistItem, LocalBudgetLine } from '@/types'

// ─── Checklist ────────────────────────────────────────────────────────────────

export function useChecklistItems(weddingId: string) {
  return useQuery({
    queryKey: ['checklist', weddingId],
    queryFn: async () => {
      const local = await weddingDB.checklistItems.where('weddingId').equals(weddingId)
        .filter(i => !i.deletedAt).toArray()
      if (local.length > 0) return local.sort((a, b) => a.order - b.order)
      const res = await fetch(`/api/weddings/${weddingId}/checklist`)
      if (!res.ok) throw new Error('Failed to load checklist')
      const items: LocalChecklistItem[] = await res.json()
      await weddingDB.checklistItems.bulkPut(items)
      return items.sort((a, b) => a.order - b.order)
    },
    staleTime: 30_000,
    gcTime: Infinity,
  })
}

export function useToggleChecklistItem(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, currentVersion }: { itemId: string; currentVersion: number }) => {
      const existing = await weddingDB.checklistItems.get(itemId)
      if (!existing) throw new Error('Item not found')
      const updated: LocalChecklistItem = {
        ...existing,
        isChecked: !existing.isChecked,
        checkedAt: !existing.isChecked ? Date.now() : undefined,
        updatedAt: Date.now(),
        isDirty: true,
      }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.checklistItems, queryKey: ['checklist', weddingId], data: updated, operation: 'put', entityType: 'checklist_item', syncOp: 'CHECK', priority: 2, clientVersion: currentVersion })
      if (!r.ok) throw r.error
      return updated
    },
  })
}

export function useAddChecklistItem(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<LocalChecklistItem, 'id'|'version'|'checksum'|'isDirty'|'updatedAt'>) => {
      const item: LocalChecklistItem = {
        ...data, id: uuidv4(), weddingId, isChecked: false,
        version: 0, checksum: '', isDirty: true, updatedAt: Date.now(),
      }
      item.checksum = computeChecksum(item as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.checklistItems, queryKey: ['checklist', weddingId], data: item, operation: 'add', entityType: 'checklist_item', syncOp: 'CREATE', priority: 2 })
      if (!r.ok) throw r.error
      return item
    },
  })
}

export function useUpdateChecklistItem(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<LocalChecklistItem> & { id: string; currentVersion: number }) => {
      const existing = await weddingDB.checklistItems.get(patch.id)
      if (!existing) throw new Error('Item not found')
      const updated: LocalChecklistItem = {
        ...existing, ...patch,
        updatedAt: Date.now(), isDirty: true,
      }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.checklistItems, queryKey: ['checklist', weddingId], data: updated, operation: 'put', entityType: 'checklist_item', syncOp: 'UPDATE', priority: 2, clientVersion: patch.currentVersion })
      if (!r.ok) throw r.error
      return updated
    },
  })
}

export function useDeleteChecklistItem(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, currentVersion }: { itemId: string; currentVersion: number }) => {
      const existing = await weddingDB.checklistItems.get(itemId)
      if (!existing) throw new Error('Item not found')
      const updated: LocalChecklistItem = {
        ...existing, deletedAt: Date.now(), updatedAt: Date.now(), isDirty: true,
      }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.checklistItems, queryKey: ['checklist', weddingId], data: updated, operation: 'put', entityType: 'checklist_item', syncOp: 'DELETE', priority: 2, clientVersion: currentVersion })
      if (!r.ok) throw r.error
      return itemId
    },
  })
}
// ─── Budget ───────────────────────────────────────────────────────────────────

export function useBudgetLines(weddingId: string) {
  return useQuery({
    queryKey: ['budget', weddingId],
    queryFn: async () => {
      const sanitize = (l: LocalBudgetLine): LocalBudgetLine => ({
        ...l,
        estimated: Number(l.estimated) || 0,
        actual: Number(l.actual) || 0,
      })
      // Always fetch from server (actual is server-computed from payments)
      const res = await fetch(`/api/weddings/${weddingId}/budget`)
      if (!res.ok) {
        // Offline fallback: return Dexie data
        const local = await weddingDB.budgetLines.where('weddingId').equals(weddingId)
          .filter(l => !l.deletedAt).toArray()
        return local.map(sanitize)
      }
      const serverLines: LocalBudgetLine[] = (await res.json() as LocalBudgetLine[]).map(sanitize)
      // Merge any dirty (unsynced) local lines not yet on the server
      const dirty = (await weddingDB.budgetLines.where('weddingId').equals(weddingId)
        .filter(l => !!l.isDirty && !l.deletedAt).toArray()).map(sanitize)
      const dirtyIds = new Set(dirty.map(l => l.id))
      await weddingDB.budgetLines.bulkPut(serverLines)
      return [...serverLines.filter(l => !dirtyIds.has(l.id)), ...dirty]
    },
    staleTime: 0,
    gcTime: Infinity,
  })
}

export function useBudgetSummary(weddingId: string) {
  const { data: lines = [] } = useBudgetLines(weddingId)
  const totalEstimated = lines.reduce((s, l) => s + l.estimated, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)
  const byCategory = lines.reduce<Record<string, { estimated: number; actual: number }>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = { estimated: 0, actual: 0 }
    acc[l.category].estimated += l.estimated
    acc[l.category].actual += l.actual
    return acc
  }, {})
  return { totalEstimated, totalActual, byCategory, lines }
}

export function useAddBudgetLine(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<LocalBudgetLine, 'id'|'version'|'checksum'|'isDirty'|'updatedAt'>) => {
      const line: LocalBudgetLine = {
        ...data, id: uuidv4(), weddingId,
        version: 0, checksum: '', isDirty: true, updatedAt: Date.now(),
      }
      line.checksum = computeChecksum(line as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.budgetLines, queryKey: ['budget', weddingId], data: line, operation: 'add', entityType: 'budget_line', syncOp: 'CREATE', priority: 2 })
      if (!r.ok) throw r.error
      return line
    },
  })
}
