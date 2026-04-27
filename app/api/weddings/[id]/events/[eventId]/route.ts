import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100),
  type: z.enum(['WEDDING', 'TRADITIONAL', 'RECEPTION', 'ENGAGEMENT', 'CIVIL', 'POST_WEDDING']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isMain: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const { id: weddingId, eventId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this wedding
    const wedding = await db.wedding.findFirst({
      where: {
        id: weddingId,
        OR: [
          { createdBy: session.user.id },
          { 
            members: {
              some: {
                userId: session.user.id,
              }
            }
          }
        ]
      }
    })

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)

    // Check if event exists and belongs to this wedding
    const existingEvent = await db.weddingEvent.findFirst({
      where: {
        id: eventId,
        weddingId,
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // If setting as main event, unset other main events
    if (validatedData.isMain) {
      await db.weddingEvent.updateMany({
        where: {
          weddingId,
          id: { not: eventId },
        },
        data: {
          isMain: false,
        }
      })
    }

    // Update the event
    const updatedEvent = await db.weddingEvent.update({
      where: { id: eventId },
      data: {
        name: validatedData.name,
        type: validatedData.type,
        date: new Date(validatedData.date),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        venue: validatedData.venue,
        description: validatedData.description,
        isMain: validatedData.isMain ?? existingEvent.isMain,
      },
      select: {
        id: true,
        name: true,
        type: true,
        date: true,
        startTime: true,
        endTime: true,
        venue: true,
        description: true,
        isMain: true,
      }
    })

    return NextResponse.json(updatedEvent)

  } catch (error) {
    console.error('Error updating event:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const { id: weddingId, eventId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this wedding
    const wedding = await db.wedding.findFirst({
      where: {
        id: weddingId,
        OR: [
          { createdBy: session.user.id },
          { 
            members: {
              some: {
                userId: session.user.id,
              }
            }
          }
        ]
      }
    })

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    }

    // Get the event
    const event = await db.weddingEvent.findFirst({
      where: {
        id: eventId,
        weddingId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        date: true,
        startTime: true,
        endTime: true,
        venue: true,
        description: true,
        isMain: true,
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)

  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}