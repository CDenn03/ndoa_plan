import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, departureLocation, arrivalLocation, departureTime, capacity } = body

  if (!name || !departureLocation || !arrivalLocation || !departureTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const route = await db.transportRoute.create({
    data: { weddingId: id, name, departureLocation, arrivalLocation, departureTime: new Date(departureTime), capacity: capacity ?? null },
  })
  return NextResponse.json(route, { status: 201 })
}
