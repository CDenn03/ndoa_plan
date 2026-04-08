import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { hotelName, address, checkIn, checkOut, roomsBlocked, notes } = body

  if (!hotelName || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'hotelName, checkIn, and checkOut are required' }, { status: 400 })
  }

  const accommodation = await db.accommodation.create({
    data: { weddingId: id, hotelName, address: address || null, checkIn: new Date(checkIn), checkOut: new Date(checkOut), roomsBlocked: roomsBlocked ?? null, notes: notes || null },
  })
  return NextResponse.json(accommodation, { status: 201 })
}
