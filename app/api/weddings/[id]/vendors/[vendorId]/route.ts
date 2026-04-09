import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, category, status, contactName, contactPhone, contactEmail, amount, paidAmount, depositAmount, notes, description, isBackup, rating } = body

  const vendor = await db.vendor.update({
    where: { id: vendorId, weddingId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(status !== undefined && { status }),
      ...(contactName !== undefined && { contactName: contactName || null }),
      ...(contactPhone !== undefined && { contactPhone: contactPhone || null }),
      ...(contactEmail !== undefined && { contactEmail: contactEmail || null }),
      ...(amount !== undefined && { amount: amount ?? null }),
      ...(paidAmount !== undefined && { paidAmount }),
      ...(depositAmount !== undefined && { depositAmount: depositAmount ?? null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(description !== undefined && { description: description || null }),
      ...(isBackup !== undefined && { isBackup }),
      ...(rating !== undefined && { rating: rating ?? null }),
      version: { increment: 1 },
      updatedBy: userId,
    },
  })
  return NextResponse.json({ ...vendor, amount: vendor.amount ? Number(vendor.amount) : null, paidAmount: Number(vendor.paidAmount) })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.vendor.update({ where: { id: vendorId, weddingId: id }, data: { deletedAt: new Date(), updatedBy: userId } })
  return NextResponse.json({ ok: true })
}
