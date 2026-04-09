import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; routeId: string }> }) {
  const { id, routeId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { name, departureLocation, arrivalLocation, departureTime, capacity } = body
  const route = await db.transportRoute.update({
    where: { id: routeId, weddingId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(departureLocation !== undefined && { departureLocation }),
      ...(arrivalLocation !== undefined && { arrivalLocation }),
      ...(departureTime !== undefined && { departureTime: new Date(departureTime) }),
      ...(capacity !== undefined && { capacity: capacity ?? null }),
    },
  })
  return NextResponse.json({ ...route, departureTime: route.departureTime.toISOString(), createdAt: route.createdAt.toISOString() })
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; routeId: string }> }) {
  const { id, routeId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await db.transportRoute.delete({ where: { id: routeId, weddingId: id } })
  return NextResponse.json({ ok: true })
} 