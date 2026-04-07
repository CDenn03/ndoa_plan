'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { weddingDB } from '@/lib/db/dexie'
import { computeChecksum } from '@/lib/db/checksum'
import { atomicWrite } from './use-atomic-write'
import { v4 as uuidv4 } from 'uuid'
import type { LocalVendor } from '@/types'

export function useVendors(weddingId: string) {
  return useQuery({
    queryKey: ['vendors', weddingId],
    queryFn: async () => {
      const local = await weddingDB.vendors.where('weddingId').equals(weddingId)
        .filter(v => !v.deletedAt).toArray()
      if (local.length > 0) return local
      const res = await fetch(`/api/weddings/${weddingId}/vendors`)
      if (!res.ok) throw new Error('Failed to load vendors')
      const vendors: LocalVendor[] = await res.json()
      await weddingDB.vendors.bulkPut(vendors)
      return vendors
    },
    staleTime: 30_000,
    gcTime: Infinity,
  })
}

export function useVendorStats(weddingId: string) {
  const { data: vendors = [] } = useVendors(weddingId)
  const totalAmount = vendors.reduce((s, v) => s + (v.amount ?? 0), 0)
  const totalPaid = vendors.reduce((s, v) => s + v.paidAmount, 0)
  return {
    total: vendors.length,
    confirmed: vendors.filter(v => v.status === 'CONFIRMED').length,
    booked: vendors.filter(v => v.status === 'BOOKED').length,
    pending: vendors.filter(v => ['ENQUIRED', 'QUOTED'].includes(v.status)).length,
    cancelled: vendors.filter(v => v.status === 'CANCELLED').length,
    totalAmount,
    totalPaid,
    totalOwed: totalAmount - totalPaid,
  }
}

export function useAddVendor(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<LocalVendor, 'id'|'version'|'checksum'|'isDirty'|'updatedAt'>) => {
      const vendor: LocalVendor = {
        ...data, id: uuidv4(), weddingId, paidAmount: data.paidAmount ?? 0,
        version: 0, checksum: '', isDirty: true, updatedAt: Date.now(),
      }
      vendor.checksum = computeChecksum(vendor as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.vendors, queryKey: ['vendors', weddingId], data: vendor, operation: 'add', entityType: 'vendor', syncOp: 'CREATE', priority: 2, clientVersion: 0 })
      if (!r.ok) throw r.error
      return vendor
    },
  })
}

export function useUpdateVendorStatus(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vendorId, status, currentVersion }: { vendorId: string; status: LocalVendor['status']; currentVersion: number }) => {
      const existing = await weddingDB.vendors.get(vendorId)
      if (!existing) throw new Error('Vendor not found')
      const updated: LocalVendor = { ...existing, status, lastContactAt: Date.now(), updatedAt: Date.now(), isDirty: true }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.vendors, queryKey: ['vendors', weddingId], data: updated, operation: 'put', entityType: 'vendor', syncOp: 'UPDATE', priority: 2, clientVersion: currentVersion })
      if (!r.ok) throw r.error
      return updated
    },
  })
}

export function useUpdateVendor(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vendorId, data, currentVersion }: { vendorId: string; data: Partial<LocalVendor>; currentVersion: number }) => {
      const existing = await weddingDB.vendors.get(vendorId)
      if (!existing) throw new Error('Vendor not found')
      const updated: LocalVendor = { ...existing, ...data, updatedAt: Date.now(), isDirty: true }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.vendors, queryKey: ['vendors', weddingId], data: updated, operation: 'put', entityType: 'vendor', syncOp: 'UPDATE', priority: 2, clientVersion: currentVersion })
      if (!r.ok) throw r.error
      return updated
    },
  })
}
