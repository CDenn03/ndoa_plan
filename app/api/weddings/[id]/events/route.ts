import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await db.weddingEvent.findMany({
    where: { weddingId: id },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, date, venue, description } = body

  if (!name || !type || !date) {
    return NextResponse.json({ error: 'name, type, and date are required' }, { status: 400 })
  }

  const event = await db.weddingEvent.create({
    data: {
      weddingId: id,
      name,
      type,
      date: new Date(date),
      venue: venue || null,
      description: description || null,
    },
  })
  return NextResponse.json(event, { status: 201 })
}
