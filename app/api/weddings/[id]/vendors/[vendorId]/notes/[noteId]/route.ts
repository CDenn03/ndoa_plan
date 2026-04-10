import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; vendorId: string; noteId: string }> }) {
  const { id, vendorId, noteId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.vendorNote.delete({ where: { id: noteId, vendorId, weddingId: id } })
  return NextResponse.json({ ok: true })
}
