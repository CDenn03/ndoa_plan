import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notes = await db.vendorNote.findMany({
    where: { vendorId, weddingId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const note = await db.vendorNote.create({
    data: { vendorId, weddingId: id, content: content.trim(), createdBy: userId },
  })
  return NextResponse.json(note, { status: 201 })
}
