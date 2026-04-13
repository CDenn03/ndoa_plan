import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; accommodationId: string }> }) {
  const { id, accommodationId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { hotelName, address, checkIn, checkOut, roomsBlocked, notes, isCompleted } = body
  const accommodation = await db.accommodation.update({
    where: { id: accommodationId, weddingId: id },
    data: {
      ...(hotelName !== undefined && { hotelName }),
      ...(address !== undefined && { address: address || null }),
      ...(checkIn !== undefined && { checkIn: new Date(checkIn) }),
      ...(checkOut !== undefined && { checkOut: new Date(checkOut) }),
      ...(roomsBlocked !== undefined && { roomsBlocked: roomsBlocked ?? null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(isCompleted !== undefined && { isCompleted }),
    },
  })
  return NextResponse.json({ ...accommodation, checkIn: accommodation.checkIn.toISOString(), checkOut: accommodation.checkOut.toISOString(), createdAt: accommodation.createdAt.toISOString() })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; accommodationId: string }> }) {
  const { id, accommodationId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await db.accommodation.delete({ where: { id: accommodationId, weddingId: id } })
  return NextResponse.json({ ok: true })
}