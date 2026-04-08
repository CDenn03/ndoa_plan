import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { uploadFile } from '@/lib/storage/supabase-storage'
import type { StorageBucket } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bucket = formData.get('bucket') as string | null
  const path = formData.get('path') as string | null
  const weddingId = formData.get('weddingId') as string | null

  if (!file || !bucket || !path || !weddingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const member = await db.weddingMember.findFirst({ where: { weddingId, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!path.startsWith(`${weddingId}/`)) {
    return NextResponse.json({ error: 'Path must be scoped to weddingId' }, { status: 403 })
  }

  try {
    const result = await uploadFile({
      bucket: bucket as StorageBucket,
      path,
      file,
      contentType: file.type,
      weddingId,
    })
    return NextResponse.json({ path: result.path })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    console.error('[storage/upload]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
