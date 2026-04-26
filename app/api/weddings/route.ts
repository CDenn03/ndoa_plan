import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensurePrivateBuckets } from '@/lib/storage/supabase-storage'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const body = await req.json()

  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const wedding = await db.wedding.create({
    data: {
      name: body.name,
      venue: body.venue ?? null,
      venueCapacity: body.venueCapacity ?? null,
      budget: body.budget ?? 0,
      culturalType: body.culturalType ?? 'STANDARD',
      themeColor: body.themeColor ?? '#8B5CF6',
      members: {
        create: { userId, role: 'COUPLE' },
      },
    },
  })

  // Seed default checklist items for this wedding
  await seedDefaultChecklist(wedding.id)

  // Ensure storage buckets are private (idempotent)
  try { await ensurePrivateBuckets() } catch { /* Non-fatal on first run */ }

  return NextResponse.json({ id: wedding.id, name: wedding.name }, { status: 201 })
}

async function seedDefaultChecklist(weddingId: string) {
  const items = [
    { title: 'Book the venue', category: 'VENUE', priority: 1, order: 1 },
    { title: 'Set the guest list', category: 'INVITATIONS', priority: 1, order: 2 },
    { title: 'Book catering', category: 'CATERING', priority: 1, order: 3 },
    { title: 'Book photographer', category: 'PHOTOGRAPHY', priority: 1, order: 4 },
    { title: 'Send invitations', category: 'INVITATIONS', priority: 1, order: 5 },
    { title: 'Book florist', category: 'DECORATIONS', priority: 2, order: 6 },
    { title: 'Order wedding cake', category: 'CATERING', priority: 2, order: 7 },
    { title: 'Arrange transport', category: 'TRANSPORT', priority: 2, order: 8 },
    { title: 'Book DJ/band', category: 'MUSIC', priority: 2, order: 9 },
    { title: 'Apply for marriage certificate', category: 'LEGAL', priority: 1, order: 10 },
    { title: 'Confirm guest dietary requirements', category: 'CATERING', priority: 2, order: 11 },
    { title: 'Finalise seating plan', category: 'VENUE', priority: 2, order: 12 },
    { title: 'Confirm all vendors 1 week before', category: 'OTHER', priority: 1, order: 13 },
    { title: 'Prepare final payments for vendors', category: 'OTHER', priority: 1, order: 14 },
  ]

  await db.checklistItem.createMany({
    data: items.map(i => ({
      weddingId,
      ...i,
      version: 1,
      checksum: '',
    })),
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const memberships = await db.weddingMember.findMany({
    where: { userId },
    include: { wedding: { select: { id: true, name: true, venue: true, themeColor: true } } },
    orderBy: { wedding: { date: 'asc' } },
  })

  return NextResponse.json(memberships.map(m => ({
    id: m.wedding.id,
    name: m.wedding.name,
    venue: m.wedding.venue,
    themeColor: m.wedding.themeColor,
    role: m.role,
  })))
}
