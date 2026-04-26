import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({
    where: { weddingId: params.id, userId },
    include: { wedding: true },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(member.wedding)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id

  const member = await db.weddingMember.findFirst({
    where: { weddingId: params.id, userId },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['COUPLE', 'PLANNER'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await db.wedding.update({
    where: { id: params.id },
    data: {
      name: body.name,
      brideName: body.brideName ?? undefined,
      groomName: body.groomName ?? undefined,
      venue: body.venue ?? null,
      venueCapacity: body.venueCapacity ?? null,
      budget: body.budget ?? undefined,
      currency: body.currency ?? undefined,
      culturalType: body.culturalType ?? undefined,
      themeColor: body.themeColor ?? undefined,
      themeAccent: body.themeAccent ?? undefined,
      couplePhotoPath: body.couplePhotoPath ?? undefined,
      couplePhotoFocalX: body.couplePhotoFocalX ?? undefined,
      couplePhotoFocalY: body.couplePhotoFocalY ?? undefined,
      expectedGuestCount: body.expectedGuestCount ?? null,
      setupComplete: body.setupComplete ?? undefined,
      ...(Array.isArray(body.palette) && { palette: body.palette }),
    },
  })

  await db.auditLog.create({
    data: {
      weddingId: params.id,
      actorId: userId,
      actorRole: member.role,
      action: 'wedding.updated',
      resourceId: params.id,
      resourceType: 'wedding',
      nextState: JSON.stringify({ name: updated.name }),
    },
  })

  return NextResponse.json(updated)
}
