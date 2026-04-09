import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const culturalType = searchParams.get('culturalType')

  const templates = await db.template.findMany({
    where: {
      ...(type ? { type: type as never } : {}),
      ...(culturalType ? { OR: [{ culturalType: culturalType as never }, { culturalType: null }] } : {}),
    },
    orderBy: [{ culturalType: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(templates)
}
