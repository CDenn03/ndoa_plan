import type { ConflictPayload, ConflictResolution, EntityType } from '@/types'

const VENDOR_STATUS_ORDER: Record<string, number> = {
  enquired: 0, quoted: 1, booked: 2, confirmed: 3, cancelled: 4, completed: 5,
}

function fieldMerge(
  base: Record<string, unknown>,
  client: Record<string, unknown>,
  server: Record<string, unknown>
): { merged: Record<string, unknown>; serverWonFields: string[] } {
  const merged = { ...server }
  const serverWonFields: string[] = []
  const allKeys = new Set([...Object.keys(client), ...Object.keys(server)])
  for (const key of allKeys) {
    const clientChanged = JSON.stringify(client[key]) !== JSON.stringify(base[key])
    const serverChanged = JSON.stringify(server[key]) !== JSON.stringify(base[key])
    if (clientChanged && !serverChanged) merged[key] = client[key]
    else if (clientChanged && serverChanged) serverWonFields.push(key)
  }
  return { merged, serverWonFields }
}

export interface ResolveResult {
  resolution: ConflictResolution
  mergedState: Record<string, unknown>
  needsHumanReview: boolean
  summary: string
}

export function resolveConflict(conflict: ConflictPayload): ResolveResult {
  const { entityType, clientState, serverState } = conflict

  switch (entityType) {
    case 'guest': {
      const { merged, serverWonFields } = fieldMerge(clientState, clientState, serverState)
      // rsvpStatus: server wins always
      merged.rsvpStatus = serverState.rsvpStatus
      // checkedIn: OR-set
      if (clientState.checkedIn === true) {
        merged.checkedIn = true
        if (clientState.checkedInAt) merged.checkedInAt = clientState.checkedInAt
      }
      const needsHuman = serverWonFields.filter(f => !['rsvpStatus','updatedAt'].includes(f)).length > 0
      return {
        resolution: needsHuman ? 'needs_human' : 'field_merge',
        mergedState: merged,
        needsHumanReview: needsHuman,
        summary: needsHuman
          ? `Guest "${serverState.name}" edited on two devices. Server version kept; please review.`
          : `Guest synced. RSVP authoritative from server.`,
      }
    }

    case 'vendor': {
      const clientOrder = VENDOR_STATUS_ORDER[clientState.status as string] ?? -1
      const serverOrder = VENDOR_STATUS_ORDER[serverState.status as string] ?? -1
      const merged = { ...serverState }
      if (clientState.status === 'cancelled' || serverState.status === 'cancelled') {
        merged.status = 'cancelled'
      } else if (clientOrder > serverOrder) {
        merged.status = clientState.status
      }
      return { resolution: 'server_wins', mergedState: merged, needsHumanReview: false, summary: `Vendor status resolved to "${merged.status}".` }
    }

    case 'payment':
    case 'committee_contribution':
      return { resolution: 'server_wins', mergedState: serverState, needsHumanReview: false, summary: 'Payment data is server-authoritative.' }

    case 'checklist_item': {
      const merged = {
        ...serverState,
        isChecked: clientState.isChecked === true || serverState.isChecked === true,
      }
      return { resolution: 'field_merge', mergedState: merged, needsHumanReview: false, summary: 'Checklist item merged. Completed state preserved.' }
    }

    case 'budget_line': {
      const { merged, serverWonFields } = fieldMerge(clientState, clientState, serverState)
      const needsHuman = serverWonFields.includes('estimated') || serverWonFields.includes('actual') 
      return {
        resolution: needsHuman ? 'needs_human' : 'field_merge',
        mergedState: merged,
        needsHumanReview: needsHuman,
        summary: needsHuman ? 'Budget amount edited by two people. Please review.' : 'Budget line merged automatically.',
      }
    }

    default:
      return { resolution: 'server_wins', mergedState: serverState, needsHumanReview: false, summary: 'Server state applied.' }
  }
}
