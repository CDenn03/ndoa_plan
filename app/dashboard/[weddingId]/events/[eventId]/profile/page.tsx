import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { EventProfileClient } from './event-profile-client'
import { sanitizeNumeric, addBudgetAmounts } from '@/lib/budget-helpers'
import type { EventProfileData } from '@/types/event-profile'

export default async function EventProfilePage(props: Readonly<{ 
  params: Promise<{ weddingId: string; eventId: string }> 
}>) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { weddingId, eventId } = params

  // Fetch event data
  const eventData = await db.weddingEvent.findUnique({
    where: { id: eventId, weddingId }
  })

  if (!eventData) {
    redirect(`/dashboard/${weddingId}/events`)
  }

  // Fetch wedding data including theme colors from palette
  const wedding = await db.wedding.findUnique({
    where: { id: weddingId },
    select: { 
      name: true,
      palette: true,
      budget: true,
      couplePhotoPath: true
    }
  })

  // Parse theme colors from palette (use first two colors)
  const parsePalette = (raw: string[]) => {
    return raw.map(s => {
      const [name, hex] = s.split('|')
      return { name: name ?? '', hex: hex ?? '' }
    })
  }
  
  const paletteColors = wedding?.palette ? parsePalette(wedding.palette) : []
  const themeColor = paletteColors[0]?.hex || '#1F4D3A'
  const themeAccent = paletteColors[1]?.hex || '#D4A94F'

  // Fetch comprehensive analytics data
  const [
    checklistItems, 
    budgetLines, 
    guests, 
    vendors, 
    appointments, 
    payments,
    contributions,
    risks
  ] = await Promise.all([
    db.checklistItem.findMany({
      where: { eventId, deletedAt: null },
      select: {
        id: true, title: true, isChecked: true, priority: true, 
        dueDate: true, category: true, createdAt: true
      }
    }),
    db.budgetLine.findMany({
      where: { eventId, deletedAt: null },
      select: {
        id: true, category: true, description: true, 
        estimated: true, actual: true, createdAt: true
      }
    }),
    db.guestEventAttendance.findMany({
      where: { eventId },
      include: {
        guest: {
          select: { id: true, name: true, priority: true }
        }
      }
    }),
    db.vendorEventAssignment.findMany({
      where: { eventId },
      include: {
        vendor: {
          select: { 
            id: true, name: true, category: true, status: true,
            amount: true, paidAmount: true, contactPhone: true, contactEmail: true
          }
        }
      }
    }),
    db.appointment.findMany({
      where: { eventId },
      select: {
        id: true, title: true, startAt: true, status: true, 
        location: true, createdAt: true
      }
    }),
    db.payment.findMany({
      where: { eventId, deletedAt: null },
      select: {
        id: true, amount: true, status: true, payerName: true, 
        paymentDate: true, createdAt: true
      }
    }),
    db.committeeContribution.findMany({
      where: { eventId },
      select: {
        id: true, memberName: true, pledgeAmount: true, 
        paidAmount: true, status: true, createdAt: true
      }
    }),
    db.riskAlert.findMany({
      where: { weddingId, isResolved: false },
      select: {
        id: true, severity: true, message: true, category: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ])

  // Calculate comprehensive analytics
  const now = new Date()
  const eventDate = new Date(eventData.date)
  const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const profileData: EventProfileData = {
    event: {
      id: eventData.id,
      name: eventData.name,
      type: eventData.type,
      date: eventData.date.toISOString(),
      venue: eventData.venue,
      description: eventData.description,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      isMain: eventData.isMain,
      themeColor,
      themeAccent
    },
    wedding: {
      name: wedding?.name || '',
      budget: sanitizeNumeric(wedding?.budget),
      couplePhotoPath: wedding?.couplePhotoPath
    },
    analytics: {
      daysUntilEvent,
      tasks: {
        total: checklistItems.length,
        completed: checklistItems.filter(t => t.isChecked).length,
        overdue: checklistItems.filter(t => 
          !t.isChecked && t.dueDate && new Date(t.dueDate) < now
        ).length,
        highPriority: checklistItems.filter(t => 
          !t.isChecked && t.priority === 1
        ).length
      },
      budget: {
        allocated: budgetLines.reduce((sum, b) => addBudgetAmounts(sum, b.estimated), 0),
        spent: budgetLines.reduce((sum, b) => addBudgetAmounts(sum, b.actual), 0),
        lines: budgetLines.length
      },
      guests: {
        total: guests.length,
        confirmed: guests.filter(g => g.rsvpStatus === 'CONFIRMED').length,
        pending: guests.filter(g => g.rsvpStatus === 'PENDING').length,
        checkedIn: guests.filter(g => g.checkedIn).length,
        vip: guests.filter(g => g.guest.priority === 'VIP').length
      },
      vendors: {
        total: vendors.length,
        confirmed: vendors.filter(v => v.vendor.status === 'CONFIRMED').length,
        totalOwed: vendors.reduce((sum, v) => {
          const amount = sanitizeNumeric(v.vendor.amount)
          const paidAmount = sanitizeNumeric(v.vendor.paidAmount)
          return addBudgetAmounts(sum, amount - paidAmount)
        }, 0)
      },
      payments: {
        total: payments.length,
        completed: payments.filter(p => p.status === 'COMPLETED').length,
        totalReceived: payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => addBudgetAmounts(sum, p.amount), 0)
      },
      contributions: {
        total: contributions.length,
        totalPledged: contributions.reduce((sum, c) => addBudgetAmounts(sum, c.pledgeAmount), 0),
        totalPaid: contributions.reduce((sum, c) => addBudgetAmounts(sum, c.paidAmount), 0)
      },
      appointments: {
        total: appointments.length,
        upcoming: appointments.filter(a => new Date(a.startAt) > now).length
      },
      risks: {
        total: risks.length,
        critical: risks.filter(r => r.severity === 'CRITICAL').length,
        high: risks.filter(r => r.severity === 'HIGH').length
      }
    },
    activities: [
      ...checklistItems.slice(0, 5).map(t => ({
        id: t.id,
        type: 'task' as const,
        description: `${t.isChecked ? 'Completed' : 'Added'} task: ${t.title}`,
        status: t.isChecked ? 'completed' : 'pending',
        priority: t.priority === 1 ? 'high' as const : 'normal' as const,
        createdAt: t.createdAt.toISOString(),
        category: t.category
      })),
      ...payments.slice(0, 3).map(p => ({
        id: p.id,
        type: 'payment' as const,
        description: `Payment received from ${p.payerName || 'Unknown'}`,
        status: p.status.toLowerCase(),
        priority: 'normal' as const,
        createdAt: p.createdAt.toISOString(),
        amount: sanitizeNumeric(p.amount)
      })),
      ...appointments.slice(0, 2).map(a => ({
        id: a.id,
        type: 'appointment' as const,
        description: `Appointment: ${a.title}`,
        status: a.status?.toLowerCase() || 'scheduled',
        priority: 'normal' as const,
        createdAt: a.createdAt.toISOString(),
        location: a.location
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
    upcomingTasks: checklistItems
      .filter(t => !t.isChecked && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate!.toISOString(),
        category: t.category,
        priority: t.priority,
        isOverdue: new Date(t.dueDate!) < now
      })),
    recentRisks: risks.map(r => ({
      id: r.id,
      severity: r.severity,
      message: r.message,
      category: r.category,
      createdAt: r.createdAt.toISOString()
    }))
  }

  return (
    <EventProfileClient 
      weddingId={weddingId}
      profileData={profileData}
    />
  )
}