import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSignedUrl } from '@/lib/storage/supabase-storage'
import type { StorageBucket } from '@/types'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  const bucket = searchParams.get('bucket')

  if (!path || !bucket) return NextResponse.json({ error: 'Missing path or bucket' }, { status: 400 })

  try {
    const signedUrl = await getSignedUrl({ bucket: bucket as StorageBucket, path, expiresIn: 3600 })
    // Redirect to the signed URL so <img src="..."> works directly
    return NextResponse.redirect(signedUrl)
  } catch {
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as typeof session.user & { id: string }).id
  const { bucket, path, weddingId } = await req.json()

  if (!bucket || !path || !weddingId) {
    return NextResponse.json({ error: 'Missing bucket, path, or weddingId' }, { status: 400 })
  }

  const member = await db.weddingMember.findFirst({ where: { weddingId, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!path.startsWith(`${weddingId}/`)) {
    return NextResponse.json({ error: 'Path does not belong to this wedding' }, { status: 403 })
  }

  try {
    const signedUrl = await getSignedUrl({ bucket: bucket as StorageBucket, path, expiresIn: 3600 })
    return NextResponse.json({ signedUrl, expiresAt: Date.now() + 3600 * 1000 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
