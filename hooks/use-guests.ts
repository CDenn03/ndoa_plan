'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { weddingDB } from '@/lib/db/dexie'
import { computeChecksum } from '@/lib/db/checksum'
import { atomicWrite } from './use-atomic-write'
import { v4 as uuidv4 } from 'uuid'
import type { LocalGuest } from '@/types'

export function useGuests(weddingId: string) {
  return useQuery({
    queryKey: ['guests', weddingId],
    queryFn: async () => {
      const local = await weddingDB.guests.where('weddingId').equals(weddingId)
        .filter(g => !g.deletedAt).toArray()
      if (local.length > 0) return local
      const res = await fetch(`/api/weddings/${weddingId}/guests`)
      if (!res.ok) throw new Error('Failed to load guests')
      const guests: LocalGuest[] = await res.json()
      await weddingDB.guests.bulkPut(guests)
      return guests
    },
    staleTime: 30_000,
    gcTime: Infinity,
  })
}

export function useGuestStats(weddingId: string) {
  const { data: guests = [] } = useGuests(weddingId)
  return {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvpStatus === 'CONFIRMED').length,
    declined: guests.filter(g => g.rsvpStatus === 'DECLINED').length,
    pending: guests.filter(g => g.rsvpStatus === 'PENDING').length,
    checkedIn: guests.filter(g => g.checkedIn).length,
    maybe: guests.filter(g => g.rsvpStatus === 'MAYBE').length,
  }
}

export function useAddGuest(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<LocalGuest, 'id'|'version'|'checksum'|'isDirty'|'updatedAt'>) => {
      const guest: LocalGuest = {
        ...data,
        id: uuidv4(),
        weddingId,
        checkedIn: false,
        version: 0,
        checksum: '',
        isDirty: true,
        updatedAt: Date.now(),
      }
      guest.checksum = computeChecksum(guest as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.guests, queryKey: ['guests', weddingId], data: guest, operation: 'add', entityType: 'guest', syncOp: 'CREATE', priority: 2, clientVersion: 0 })
      if (!r.ok) throw r.error
      return guest
    },
  })
}

export function useUpdateGuestRsvp(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ guestId, rsvpStatus, currentVersion }: { guestId: string; rsvpStatus: LocalGuest['rsvpStatus']; currentVersion: number }) => {
      const existing = await weddingDB.guests.get(guestId)
      if (!existing) throw new Error('Guest not found')
      const updated: LocalGuest = { ...existing, rsvpStatus, updatedAt: Date.now(), isDirty: true }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.guests, queryKey: ['guests', weddingId], data: updated, operation: 'put', entityType: 'guest', syncOp: 'RSVP', priority: 1, clientVersion: currentVersion })
      if (!r.ok) throw r.error
      return updated
    },
  })
}

export function useCheckInGuest(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ guestId, currentVersion }: { guestId: string; currentVersion: number }) => {
      const existing = await weddingDB.guests.get(guestId)
      if (!existing || existing.checkedIn) return existing
      const updated: LocalGuest = { ...existing, checkedIn: true, checkedInAt: Date.now(), updatedAt: Date.now(), isDirty: true }
      updated.checksum = computeChecksum(updated as unknown as Record<string, unknown>)
      const r = await atomicWrite(qc, { table: weddingDB.guests, queryKey: ['guests', weddingId], data: updated, operation: 'put', entityType: 'guest', syncOp: 'CHECKIN', priority: 1, clientVersion: currentVersion })
      if (!r.ok) throw r.error
      return updated
    },
  })
}

export function useDeleteGuest(weddingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (guestId: string) => {
      await weddingDB.guests.update(guestId, { deletedAt: Date.now(), isDirty: true })
      qc.setQueryData(['guests', weddingId], (old: LocalGuest[] | undefined) =>
        old?.filter(g => g.id !== guestId) ?? [])
    },
  })
}
