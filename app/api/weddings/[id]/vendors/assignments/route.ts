import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  const assignments = await db.vendorEventAssignment.findMany({
    where: {
      vendor: { weddingId: id },
      ...(eventId ? { eventId } : {}),
    },
    select: { vendorId: true, eventId: true },
  })

  return NextResponse.json(assignments)
}
