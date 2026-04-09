import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const { status, description, mpesaRef, payerName, payerPhone } = body
  const payment = await db.payment.update({
    where: { id: paymentId, weddingId: id },
    data: {
      ...(status !== undefined && { status }),
      ...(description !== undefined && { description: description || null }),
      ...(mpesaRef !== undefined && { mpesaRef: mpesaRef || null }),
      ...(payerName !== undefined && { payerName: payerName || null }),
      ...(payerPhone !== undefined && { payerPhone: payerPhone || null }),
    },
  })
  return NextResponse.json({ ...payment, amount: Number(payment.amount), createdAt: payment.createdAt.toISOString() })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as typeof session.user & { id: string }).id
  const member = await db.weddingMember.findFirst({ where: { weddingId: id, userId } })
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await db.payment.update({ where: { id: paymentId, weddingId: id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}