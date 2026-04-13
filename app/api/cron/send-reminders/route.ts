import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Called by Vercel Cron every minute (or every 5 min).
// Finds unsent reminders whose triggerAt has passed and marks them sent.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Fetch due reminders with their related entity for context
  const due = await db.reminder.findMany({
    where: { sent: false, triggerAt: { lte: now } },
    include: {
      appointment: { select: { id: true, title: true, weddingId: true, startAt: true } },
      checklistItem: { select: { id: true, title: true, weddingId: true, dueDate: true } },
    },
    take: 100, // process in batches; cron will catch the rest next run
  })

  if (due.length === 0) {
    return NextResponse.json({ sent: 0, timestamp: now.toISOString() })
  }

  const errors: string[] = []
  let sent = 0

  for (const reminder of due) {
    try {
      // Dispatch notification — extend this block to call your push/email provider
      let label = 'Reminder'
      if (reminder.appointment) {
        label = `Appointment: ${reminder.appointment.title}`
      } else if (reminder.checklistItem) {
        label = `Task due: ${reminder.checklistItem.title}`
      }

      // TODO: replace with real push/email call, e.g.:
      // await sendPushNotification({ weddingId, title: label, channel: reminder.channel })
      console.log(`[reminders] dispatching ${reminder.channel} — ${label} (id: ${reminder.id})`)

      await db.reminder.update({
        where: { id: reminder.id },
        data: { sent: true },
      })
      sent++
    } catch (err) {
      errors.push(`${reminder.id}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  return NextResponse.json({ sent, errors, timestamp: now.toISOString() })
}
