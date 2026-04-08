import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, severity } = body

  if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 })

  const incident = await db.incident.create({
    data: { weddingId: id, description, severity: severity ?? 'MEDIUM' },
  })
  return NextResponse.json(incident, { status: 201 })
}
