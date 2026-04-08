import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import type { SyncBatchRequest, SyncBatchResponse, SyncOperation, SyncOperationResult } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  let body: SyncBatchRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.weddingId || !Array.isArray(body.operations)) {
    return NextResponse.json({ error: 'Missing weddingId or operations' }, { status: 400 })
  }

  // Verify membership
  const member = await db.weddingMember.findFirst({
    where: { weddingId: body.weddingId, userId },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const results: SyncOperationResult[] = []

  for (const op of body.operations) {
    try {
      const result = await processOperation(op, userId, member.role)
      results.push(result)
    } catch (err) {
      results.push({
        operationId: op.operationId,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const response: SyncBatchResponse = { results, serverTimestamp: Date.now() }
  return NextResponse.json(response)
}

// ─── Process one operation ────────────────────────────────────────────────────

async function processOperation(
  op: SyncOperation,
  actorId: string,
  actorRole: string
): Promise<SyncOperationResult> {
  // Idempotency: already processed?
  const existing = await db.processedOperation.findUnique({ where: { operationId: op.operationId } })
  if (existing) {
    return {
      operationId: op.operationId,
      status: 'duplicate',
      serverId: existing.resultServerId ?? undefined,
      serverVersion: existing.resultVersion ?? undefined,
    }
  }

  switch (op.operation) {
    case 'CREATE':   return handleCreate(op, actorId, actorRole)
    case 'UPDATE':
    case 'RSVP':
    case 'CHECKIN':
    case 'CHECK':    return handleUpdate(op, actorId, actorRole)
    case 'DELETE':   return handleDelete(op, actorId, actorRole)
    case 'PAY':      return handlePayment(op, actorId)
    default:         return { operationId: op.operationId, status: 'error', error: 'Unknown operation' }
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

async function handleCreate(op: SyncOperation, actorId: string, actorRole: string): Promise<SyncOperationResult> {
  const tableKey = entityToTable(op.entityType)
  if (!tableKey) return { operationId: op.operationId, status: 'error', error: `Unknown entity: ${op.entityType}` }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (db as any)[tableKey].create({
    data: {
      ...sanitisePayload(op.payload),
      id: undefined,
      localId: op.entityId,
      version: 1,
      checksum: op.payload.checksum ?? '',
      updatedBy: actorId,
    },
  })

  await db.processedOperation.create({
    data: { operationId: op.operationId, resultCode: 201, resultServerId: record.id, resultVersion: 1 },
  })

  await writeAudit({ weddingId: op.payload.weddingId as string, actorId, actorRole, action: `${op.entityType}.created`, resourceId: record.id, resourceType: op.entityType, nextState: record })

  return { operationId: op.operationId, status: 'ok', serverId: record.id, serverVersion: 1 }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

async function handleUpdate(op: SyncOperation, actorId: string, actorRole: string): Promise<SyncOperationResult> {
  const tableKey = entityToTable(op.entityType)
  if (!tableKey) return { operationId: op.operationId, status: 'error', error: `Unknown entity: ${op.entityType}` }

  const serverId = (op.serverId ?? op.entityId) as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = await (db as any)[tableKey].findUnique({ where: { id: serverId } })
  if (!current) return { operationId: op.operationId, status: 'error', error: 'Record not found' }

  // Version conflict detection
  if (op.clientVersion !== current.version) {
    return {
      operationId: op.operationId,
      status: 'conflict',
      serverVersion: current.version,
      conflict: {
        operationId: op.operationId,
        entityType: op.entityType,
        entityId: serverId,
        clientState: op.payload,
        serverState: current,
        clientVersion: op.clientVersion,
        serverVersion: current.version,
        resolution: 'needs_human',
      },
    }
  }

  const prevState = { ...current }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (db as any)[tableKey].update({
    where: { id: serverId },
    data: {
      ...sanitisePayload(op.payload),
      version: { increment: 1 },
      updatedBy: actorId,
      updatedAt: new Date(),
    },
  })

  await db.processedOperation.create({
    data: { operationId: op.operationId, resultCode: 200, resultServerId: serverId, resultVersion: updated.version },
  })

  await writeAudit({ weddingId: current.weddingId, actorId, actorRole, action: `${op.entityType}.${op.operation.toLowerCase()}`, resourceId: serverId, resourceType: op.entityType, prevState, nextState: updated })

  return { operationId: op.operationId, status: 'ok', serverId, serverVersion: updated.version }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function handleDelete(op: SyncOperation, actorId: string, actorRole: string): Promise<SyncOperationResult> {
  const tableKey = entityToTable(op.entityType)
  if (!tableKey) return { operationId: op.operationId, status: 'error', error: `Unknown entity: ${op.entityType}` }

  const serverId = (op.serverId ?? op.entityId) as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current = await (db as any)[tableKey].findUnique({ where: { id: serverId } })
  if (!current) return { operationId: op.operationId, status: 'ok', serverId }

  if (op.clientVersion !== current.version) {
    return {
      operationId: op.operationId,
      status: 'conflict',
      conflict: {
        operationId: op.operationId,
        entityType: op.entityType,
        entityId: serverId,
        clientState: { deleted: true },
        serverState: current,
        clientVersion: op.clientVersion,
        serverVersion: current.version,
        resolution: 'needs_human',
      },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)[tableKey].update({
    where: { id: serverId },
    data: { deletedAt: new Date(), deletedBy: actorId, version: { increment: 1 } },
  })

  await db.processedOperation.create({ data: { operationId: op.operationId, resultCode: 200, resultServerId: serverId } })
  await writeAudit({ weddingId: current.weddingId, actorId, actorRole, action: `${op.entityType}.deleted`, resourceId: serverId, resourceType: op.entityType, prevState: current })

  return { operationId: op.operationId, status: 'ok', serverId }
}

// ─── PAYMENT ──────────────────────────────────────────────────────────────────

async function handlePayment(op: SyncOperation, actorId: string): Promise<SyncOperationResult> {
  const mpesaRef = op.payload.mpesaRef as string | undefined

  if (mpesaRef) {
    const dup = await db.payment.findUnique({ where: { mpesaRef } })
    if (dup) return { operationId: op.operationId, status: 'duplicate', serverId: dup.id, serverVersion: dup.version }
  }

  const idempotencyKey = op.operationId
  const existing = await db.payment.findUnique({ where: { idempotencyKey } })
  if (existing) return { operationId: op.operationId, status: 'duplicate', serverId: existing.id }

  const payment = await db.payment.create({
    data: {
      ...(sanitisePayload(op.payload) as Parameters<typeof db.payment.create>[0]['data']),
      id: undefined,
      idempotencyKey,
      version: 1,
      status: 'PENDING',
      createdBy: actorId,
    },
  })

  await db.processedOperation.create({ data: { operationId: op.operationId, resultCode: 201, resultServerId: payment.id, resultVersion: 1 } })
  await writeAudit({ weddingId: op.payload.weddingId as string, actorId, actorRole: 'PLANNER', action: 'payment.created', resourceId: payment.id, resourceType: 'payment', nextState: payment })

  return { operationId: op.operationId, status: 'ok', serverId: payment.id, serverVersion: 1 }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ENTITY_TABLE: Record<string, string> = {
  guest: 'guest',
  vendor: 'vendor',
  timeline_event: 'timelineEvent',
  checklist_item: 'checklistItem',
  budget_line: 'budgetLine',
  payment: 'payment',
  committee_contribution: 'committeeContribution',
}

function entityToTable(entityType: string): string | null {
  return ENTITY_TABLE[entityType] ?? null
}

const STRIP_KEYS = new Set(['id', 'localId', 'serverId', 'version', 'isDirty', 'syncedAt', 'clientVersion', 'checksum'])

function sanitisePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (!STRIP_KEYS.has(k) && v !== undefined) out[k] = v
  }
  return out
}

async function writeAudit(args: {
  weddingId: string; actorId: string; actorRole: string
  action: string; resourceId: string; resourceType: string
  prevState?: unknown; nextState?: unknown
}) {
  try {
    await db.auditLog.create({
      data: {
        weddingId: args.weddingId,
        actorId: args.actorId,
        actorRole: args.actorRole,
        action: args.action,
        resourceId: args.resourceId,
        resourceType: args.resourceType,
        prevState: args.prevState ? JSON.stringify(args.prevState) : null,
        nextState: args.nextState ? JSON.stringify(args.nextState) : null,
      },
    })
  } catch {
    // Audit failures must never crash the main path
  }
}
