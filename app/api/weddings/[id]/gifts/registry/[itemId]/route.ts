import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { name, description, url, estimatedPrice, quantity, priority } = body
  const item = await db.giftRegistryItem.update({
    where: { id: itemId, weddingId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(url !== undefined && { url: url || null }),
      ...(estimatedPrice !== undefined && { estimatedPrice: estimatedPrice ?? null }),
      ...(quantity !== undefined && { quantity }),
      ...(priority !== undefined && { priority }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await db.giftRegistryItem.delete({ where: { id: itemId, weddingId: id } })
  return NextResponse.json({ ok: true })
}