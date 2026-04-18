import { PrismaClient } from '../lib/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'
import * as dotenv from 'dotenv'

dotenv.config()

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) })

const WID = 'demo-wedding-id'
const now = new Date()
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86_400_000)

async function main() {
  console.log('🌱 Seeding database...')

  // ── User ──────────────────────────────────────────────────────────────────
  const user = await db.user.upsert({
    where: { email: 'demo@ndoa.app' },
    update: {},
    create: { email: 'demo@ndoa.app', name: 'Wanjiku Kamau', role: 'COUPLE' },
  })

  // ── Wedding ───────────────────────────────────────────────────────────────
  const wedding = await db.wedding.upsert({
    where: { id: WID },
    update: {},
    create: {
      id: WID,
      name: "Wanjiku & Brian's Wedding",
      date: d(112),
      venue: 'Safari Park Hotel, Nairobi',
      venueCapacity: 350,
      budget: 2_200_000,
      culturalType: 'KIKUYU',
      themeColor: '#8B5CF6',
      themeAccent: '#F59E0B',
      members: { create: { userId: user.id, role: 'COUPLE' } },
    },
  })

  // ── Events ────────────────────────────────────────────────────────────────
  const [ruracio, civil, wedding_ev, reception] = await Promise.all([
    db.weddingEvent.upsert({ where: { id: 'ev-ruracio' }, update: {}, create: { id: 'ev-ruracio', weddingId: WID, name: 'Ruracio', type: 'RURACIO', date: d(18), venue: "Bride's Family Home, Nyeri", startTime: '10:00', endTime: '17:00' } }),
    db.weddingEvent.upsert({ where: { id: 'ev-civil' }, update: {}, create: { id: 'ev-civil', weddingId: WID, name: 'Civil Ceremony', type: 'CIVIL', date: d(111), venue: 'AG Offices, Nairobi', startTime: '09:00', endTime: '11:00' } }),
    db.weddingEvent.upsert({ where: { id: 'ev-wedding' }, update: {}, create: { id: 'ev-wedding', weddingId: WID, name: 'Wedding Ceremony', type: 'WEDDING', date: d(112), venue: 'Safari Park Hotel Chapel', startTime: '14:00', endTime: '16:00', isMain: true } }),
    db.weddingEvent.upsert({ where: { id: 'ev-reception' }, update: {}, create: { id: 'ev-reception', weddingId: WID, name: 'Reception', type: 'RECEPTION', date: d(112), venue: 'Safari Park Hotel Ballroom', startTime: '17:00', endTime: '23:00' } }),
  ])
  // events created above — referenced by id strings in checklist/contrib data
  const _evIds = [ruracio.id, civil.id, wedding_ev.id, reception.id]
  void _evIds

  // ── Guests ────────────────────────────────────────────────────────────────
  const guestData = [
    { name: 'Grace Muthoni', phone: '+254712001001', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Peter Njoroge', phone: '+254712001002', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Mary Wambui', phone: '+254712001003', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'James Kariuki', phone: '+254712001004', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Faith Nyambura', phone: '+254712001005', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Samuel Gitau', phone: '+254712001006', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Esther Wanjiru', phone: '+254712001007', rsvpStatus: 'CONFIRMED', side: 'BOTH' },
    { name: 'David Mwangi', phone: '+254712001008', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Ruth Wairimu', phone: '+254712001009', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Joseph Kamau', phone: '+254712001010', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Agnes Njeri', phone: '+254712001011', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Charles Kimani', phone: '+254712001012', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Lydia Wangari', phone: '+254712001013', rsvpStatus: 'PENDING', side: 'BRIDE' },
    { name: 'Michael Ndung\'u', phone: '+254712001014', rsvpStatus: 'PENDING', side: 'GROOM' },
    { name: 'Tabitha Maina', phone: '+254712001015', rsvpStatus: 'PENDING', side: 'BOTH' },
    { name: 'Francis Gacheru', phone: '+254712001016', rsvpStatus: 'PENDING', side: 'GROOM' },
    { name: 'Priscilla Waweru', phone: '+254712001017', rsvpStatus: 'PENDING', side: 'BRIDE' },
    { name: 'Stephen Mugo', phone: '+254712001018', rsvpStatus: 'DECLINED', side: 'GROOM' },
    { name: 'Hannah Gathoni', phone: '+254712001019', rsvpStatus: 'DECLINED', side: 'BRIDE' },
    { name: 'Daniel Kinyua', phone: '+254712001020', rsvpStatus: 'MAYBE', side: 'BOTH' },
  ]
  for (const g of guestData) {
    await db.guest.upsert({
      where: { id: `guest-${g.phone}` },
      update: {},
      create: { id: `guest-${g.phone}`, weddingId: WID, ...g, rsvpStatus: g.rsvpStatus as never, side: g.side as never, version: 1, checksum: '' },
    })
  }

  // ── Vendors ───────────────────────────────────────────────────────────────
  const vendorData = [
    { id: 'v-catering', name: 'Safari Park Catering', category: 'CATERING', status: 'CONFIRMED', amount: 550_000, paidAmount: 150_000, contactName: 'Alice Odhiambo', contactPhone: '+254720001001' },
    { id: 'v-photo', name: 'Moments Photography', category: 'PHOTOGRAPHY', status: 'CONFIRMED', amount: 130_000, paidAmount: 65_000, contactName: 'Kevin Otieno', contactPhone: '+254720001002' },
    { id: 'v-video', name: 'Cinematic Films KE', category: 'VIDEOGRAPHY', status: 'BOOKED', amount: 90_000, paidAmount: 45_000, contactName: 'Brian Omondi', contactPhone: '+254720001003' },
    { id: 'v-florist', name: 'Bloom & Petal Florals', category: 'FLORIST', status: 'BOOKED', amount: 95_000, paidAmount: 30_000, contactName: 'Mercy Achieng', contactPhone: '+254720001004' },
    { id: 'v-dj', name: 'DJ Smooth Nairobi', category: 'MUSIC_DJ', status: 'CONFIRMED', amount: 40_000, paidAmount: 20_000, contactName: 'DJ Smooth', contactPhone: '+254720001005' },
    { id: 'v-transport', name: 'Royal Coaches Ltd', category: 'TRANSPORT', status: 'BOOKED', amount: 55_000, paidAmount: 20_000, contactName: 'Tom Wekesa', contactPhone: '+254720001006' },
    { id: 'v-cake', name: 'Sweet Creations Bakery', category: 'CAKE', status: 'QUOTED', amount: 28_000, paidAmount: 0, contactName: 'Purity Njoki', contactPhone: '+254720001007' },
    { id: 'v-makeup', name: 'Glam by Zawadi', category: 'HAIR_MAKEUP', status: 'CONFIRMED', amount: 35_000, paidAmount: 15_000, contactName: 'Zawadi Auma', contactPhone: '+254720001008' },
  ]
  for (const v of vendorData) {
    await db.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: { ...v, weddingId: WID, category: v.category as never, status: v.status as never, version: 1, checksum: '' },
    })
  }

  // ── Budget Lines ──────────────────────────────────────────────────────────
  const budgetData = [
    { id: 'bl-catering', category: 'CATERING', description: 'Food & beverages (350 pax)', estimated: 550_000, actual: 150_000 },
    { id: 'bl-venue', category: 'VENUE', description: 'Safari Park Hotel venue hire', estimated: 280_000, actual: 280_000 },
    { id: 'bl-photo', category: 'PHOTOGRAPHY', description: 'Photography + second shooter', estimated: 130_000, actual: 65_000 },
    { id: 'bl-video', category: 'VIDEOGRAPHY', description: 'Cinematic film + drone', estimated: 90_000, actual: 45_000 },
    { id: 'bl-decor', category: 'DECORATIONS', description: 'Flowers, draping, centrepieces', estimated: 180_000, actual: 30_000 },
    { id: 'bl-attire', category: 'ATTIRE', description: 'Wedding dress, suits, bridesmaids', estimated: 220_000, actual: 180_000 },
    { id: 'bl-music', category: 'MUSIC', description: 'DJ + sound system', estimated: 40_000, actual: 20_000 },
    { id: 'bl-transport', category: 'TRANSPORT', description: 'Bridal car + 3 guest buses', estimated: 55_000, actual: 20_000 },
    { id: 'bl-cake', category: 'CAKE', description: '5-tier wedding cake', estimated: 28_000, actual: 0 },
    { id: 'bl-makeup', category: 'BEAUTY', description: 'Bridal hair & makeup', estimated: 35_000, actual: 15_000 },
    { id: 'bl-invites', category: 'STATIONERY', description: 'Invitations & programmes', estimated: 22_000, actual: 22_000 },
    { id: 'bl-honeymoon', category: 'HONEYMOON', description: 'Diani Beach 5 nights', estimated: 120_000, actual: 60_000 },
    { id: 'bl-misc', category: 'MISCELLANEOUS', description: 'Contingency buffer', estimated: 50_000, actual: 0 },
  ]
  for (const b of budgetData) {
    await db.budgetLine.upsert({
      where: { id: b.id },
      update: {},
      create: { ...b, weddingId: WID, version: 1, checksum: '' },
    })
  }

  // ── Committee Contributions ───────────────────────────────────────────────
  const contribData = [
    { id: 'c-001', memberName: 'Kamau Family', memberId: 'mem-001', pledgeAmount: 80_000, paidAmount: 80_000, status: 'FULFILLED' },
    { id: 'c-002', memberName: 'Njoroge Family', memberId: 'mem-002', pledgeAmount: 60_000, paidAmount: 60_000, status: 'FULFILLED' },
    { id: 'c-003', memberName: 'Wambui Muthoni', memberId: 'mem-003', pledgeAmount: 30_000, paidAmount: 20_000, status: 'PARTIAL' },
    { id: 'c-004', memberName: 'Gitau & Sons', memberId: 'mem-004', pledgeAmount: 50_000, paidAmount: 50_000, status: 'FULFILLED' },
    { id: 'c-005', memberName: 'Kariuki Clan', memberId: 'mem-005', pledgeAmount: 40_000, paidAmount: 0, status: 'PLEDGED', dueDate: d(30) },
    { id: 'c-006', memberName: 'Nyambura Grace', memberId: 'mem-006', pledgeAmount: 15_000, paidAmount: 15_000, status: 'FULFILLED' },
    { id: 'c-007', memberName: 'Mwangi Brothers', memberId: 'mem-007', pledgeAmount: 25_000, paidAmount: 10_000, status: 'PARTIAL' },
    { id: 'c-008', memberName: 'Wairimu Esther', memberId: 'mem-008', pledgeAmount: 20_000, paidAmount: 0, status: 'OVERDUE', dueDate: d(-5) },
  ]
  for (const c of contribData) {
    await db.committeeContribution.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, weddingId: WID, status: c.status as never, dueDate: c.dueDate ?? null },
    })
  }

  // ── Checklist Items ───────────────────────────────────────────────────────
  const checklistData = [
    { id: 'cl-001', title: 'Confirm final guest headcount with caterer', category: 'CATERING', dueDate: d(-3), isChecked: false, priority: 1 },
    { id: 'cl-002', title: 'Send remaining invitations (15 pending)', category: 'INVITATIONS', dueDate: d(-1), isChecked: false, priority: 1 },
    { id: 'cl-003', title: 'Final dress fitting', category: 'ATTIRE', dueDate: d(5), isChecked: false, priority: 1 },
    { id: 'cl-004', title: 'Confirm DJ playlist and do-not-play list', category: 'MUSIC', dueDate: d(7), isChecked: false, priority: 2 },
    { id: 'cl-005', title: 'Book honeymoon accommodation (Diani)', category: 'HONEYMOON', dueDate: d(10), isChecked: false, priority: 2 },
    { id: 'cl-006', title: 'Collect marriage certificate requirements', category: 'LEGAL', dueDate: d(14), isChecked: false, priority: 1 },
    { id: 'cl-007', title: 'Confirm transport pickup points and times', category: 'TRANSPORT', dueDate: d(14), isChecked: false, priority: 1 },
    { id: 'cl-008', title: 'Order wedding cake (final design approval)', category: 'CAKE', dueDate: d(21), isChecked: false, priority: 2 },
    { id: 'cl-009', title: 'Prepare seating plan', category: 'OTHER', dueDate: d(21), isChecked: false, priority: 2 },
    { id: 'cl-010', title: 'Confirm florist delivery time and setup', category: 'DECORATIONS', dueDate: d(28), isChecked: false, priority: 1 },
  ]
  for (const c of checklistData) {
    await db.checklistItem.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, weddingId: WID, version: 1, checksum: '' },
    })
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  await db.appointment.upsert({
    where: { id: 'apt-001' },
    update: {},
    create: {
      id: 'apt-001', weddingId: WID, title: 'Final dress fitting — Bridal Boutique',
      startAt: d(5), endAt: new Date(d(5).getTime() + 2 * 3600_000),
      location: 'Bridal Boutique, Westlands', status: 'SCHEDULED', createdBy: user.id,
      notes: 'Bring wedding shoes and undergarments. Confirm alterations from second fitting.',
    },
  })
  await db.appointment.upsert({
    where: { id: 'apt-002' },
    update: {},
    create: {
      id: 'apt-002', weddingId: WID, title: 'Caterer tasting — final menu sign-off',
      startAt: d(9), endAt: new Date(d(9).getTime() + 1.5 * 3600_000),
      location: 'Safari Park Hotel Kitchen', status: 'SCHEDULED', createdBy: user.id,
      notes: 'Bring dietary requirements list. Confirm vegetarian and halal options.',
    },
  })
  await db.appointment.upsert({
    where: { id: 'apt-003' },
    update: {},
    create: {
      id: 'apt-003', weddingId: WID, title: 'Venue walkthrough & seating plan review',
      startAt: d(20), endAt: new Date(d(20).getTime() + 2 * 3600_000),
      location: 'Safari Park Hotel Ballroom', status: 'SCHEDULED', createdBy: user.id,
    },
  })

  // ── Risk Alerts ───────────────────────────────────────────────────────────
  await db.riskAlert.upsert({
    where: { id: 'risk-001' },
    update: {},
    create: {
      id: 'risk-001', weddingId: WID, ruleId: 'budget-overrun',
      severity: 'HIGH', category: 'budget', isResolved: false,
      message: 'Attire spend (KES 180,000) has exceeded the estimated budget of KES 220,000 by 82%. Review remaining attire costs.',
    },
  })
  await db.riskAlert.upsert({
    where: { id: 'risk-002' },
    update: {},
    create: {
      id: 'risk-002', weddingId: WID, ruleId: 'rsvp-low',
      severity: 'MEDIUM', category: 'guests', isResolved: false,
      message: '5 guests have not responded to invitations with less than 30 days to the Ruracio. Follow up required.',
    },
  })
  await db.riskAlert.upsert({
    where: { id: 'risk-003' },
    update: {},
    create: {
      id: 'risk-003', weddingId: WID, ruleId: 'contrib-overdue',
      severity: 'HIGH', category: 'payments', isResolved: false,
      message: 'Wairimu Esther\'s contribution of KES 20,000 is 5 days overdue. Contact required.',
    },
  })
  await db.riskAlert.upsert({
    where: { id: 'risk-004' },
    update: {},
    create: {
      id: 'risk-004', weddingId: WID, ruleId: 'vendor-unconfirmed',
      severity: 'LOW', category: 'vendor', isResolved: false,
      message: 'Sweet Creations Bakery is still at QUOTED status. Confirm booking before the 30-day deadline.',
    },
  })

  // ── Vision Board Categories ───────────────────────────────────────────────
  const vbCats = [
    { id: 'vb-decor', name: 'Decor', color: '#8B5CF6', order: 0 },
    { id: 'vb-attire', name: 'Outfits', color: '#EC4899', order: 1 },
    { id: 'vb-flowers', name: 'Flowers', color: '#10B981', order: 2 },
    { id: 'vb-venue', name: 'Venue', color: '#F59E0B', order: 3 },
    { id: 'vb-food', name: 'Food', color: '#EF4444', order: 4 },
    { id: 'vb-other', name: 'Other', color: '#6B7280', order: 5 },
  ]
  for (const v of vbCats) {
    await db.visionBoardCategory.upsert({
      where: { weddingId_name: { weddingId: WID, name: v.name } },
      update: {},
      create: { ...v, weddingId: WID },
    })
  }

  console.log(`✅ Seed complete — Wedding ID: ${wedding.id}`)
  console.log('   Demo user: demo@ndoa.app')

  // ── System Templates (checklist + budget + appointment) ───────────────────
  await seedTemplates()
}

async function seedTemplates() {
  console.log('🌱 Seeding system templates...')

  const checklistTemplates = [
    { name: '12-Month Master Checklist', data: [
      { title: 'Set overall wedding budget', category: 'LEGAL', priority: 1 },
      { title: 'Choose wedding date', category: 'OTHER', priority: 1 },
      { title: 'Book main venue', category: 'VENUE', priority: 1 },
      { title: 'Create guest list (first draft)', category: 'OTHER', priority: 1 },
      { title: 'Book officiant / pastor / kadhi', category: 'LEGAL', priority: 1 },
      { title: 'Book photographer', category: 'PHOTOGRAPHY', priority: 1 },
      { title: 'Book caterer', category: 'CATERING', priority: 1 },
      { title: 'Book DJ / band', category: 'MUSIC', priority: 2 },
      { title: 'Send save-the-dates', category: 'INVITATIONS', priority: 2 },
      { title: 'Order wedding dress / attire', category: 'ATTIRE', priority: 1 },
      { title: 'Book hair & makeup artist', category: 'ATTIRE', priority: 1 },
      { title: 'Book florist', category: 'DECORATIONS', priority: 2 },
      { title: 'Book transport (bridal car, guest buses)', category: 'TRANSPORT', priority: 2 },
      { title: 'Send formal invitations', category: 'INVITATIONS', priority: 1 },
      { title: 'Confirm all vendor bookings', category: 'OTHER', priority: 1 },
      { title: 'Final dress fitting', category: 'ATTIRE', priority: 1 },
      { title: 'Confirm guest RSVPs and final headcount', category: 'OTHER', priority: 1 },
      { title: 'Prepare seating plan', category: 'OTHER', priority: 2 },
      { title: 'Collect marriage certificate requirements', category: 'LEGAL', priority: 1 },
      { title: 'Confirm all vendors have arrived', category: 'OTHER', priority: 1, isFinalCheck: true },
      { title: 'Ceremony complete', category: 'OTHER', priority: 1, isFinalCheck: true },
      { title: 'Register marriage certificate', category: 'LEGAL', priority: 1 },
      { title: 'Review and pay final vendor invoices', category: 'OTHER', priority: 1 },
    ]},
    { name: 'Ruracio Ceremony Checklist', culturalType: 'KIKUYU', data: [
      { title: 'Agree on Ruracio date with both families', category: 'LEGAL', priority: 1 },
      { title: 'Prepare dowry list (bride price items)', category: 'OTHER', priority: 1 },
      { title: 'Book venue for Ruracio', category: 'VENUE', priority: 1 },
      { title: 'Arrange catering for Ruracio guests', category: 'CATERING', priority: 1 },
      { title: 'Prepare traditional attire (Kikuyu)', category: 'ATTIRE', priority: 1 },
      { title: 'Confirm elders / spokespersons for negotiation', category: 'OTHER', priority: 1 },
      { title: "Prepare gifts for bride's family", category: 'OTHER', priority: 2 },
      { title: 'Ruracio ceremony complete', category: 'OTHER', priority: 1, isFinalCheck: true },
      { title: 'Dowry items delivered and acknowledged', category: 'OTHER', priority: 1, isFinalCheck: true },
    ]},
    { name: 'Wedding Day Checklist', data: [
      { title: 'Hair & makeup — bride', category: 'ATTIRE', priority: 1 },
      { title: 'Groom and groomsmen dressed', category: 'ATTIRE', priority: 1 },
      { title: 'Venue decorated and ready', category: 'VENUE', priority: 1 },
      { title: 'Photographer briefed', category: 'PHOTOGRAPHY', priority: 1 },
      { title: 'Caterer confirmed on-site', category: 'CATERING', priority: 1 },
      { title: 'DJ / band set up and sound-checked', category: 'MUSIC', priority: 1 },
      { title: 'Transport confirmed and on schedule', category: 'TRANSPORT', priority: 1 },
      { title: 'All vendors confirmed on-site', category: 'OTHER', priority: 1, isFinalCheck: true },
      { title: 'Ceremony complete', category: 'OTHER', priority: 1, isFinalCheck: true },
      { title: 'Rings exchanged', category: 'OTHER', priority: 1, isFinalCheck: true },
    ]},
  ]

  const budgetTemplates = [
    { name: 'Standard Wedding Budget', data: [
      { category: 'CATERING', description: 'Food and beverages', estimated: 675_000 },
      { category: 'VENUE', description: 'Venue hire', estimated: 300_000 },
      { category: 'DECORATIONS', description: 'Decor and flowers', estimated: 150_000 },
      { category: 'PHOTOGRAPHY', description: 'Photography', estimated: 120_000 },
      { category: 'VIDEOGRAPHY', description: 'Videography', estimated: 80_000 },
      { category: 'ATTIRE', description: 'Wedding dress and suits', estimated: 200_000 },
      { category: 'MUSIC', description: 'DJ / band', estimated: 60_000 },
      { category: 'TRANSPORT', description: 'Bridal car and guest transport', estimated: 75_000 },
      { category: 'CAKE', description: 'Wedding cake', estimated: 30_000 },
      { category: 'MISCELLANEOUS', description: 'Contingency buffer', estimated: 50_000 },
    ]},
  ]

  for (const t of checklistTemplates) {
    const id = `sys-checklist-${t.name.toLowerCase().replace(/[\s']+/g, '-')}`
    await db.template.upsert({ where: { id }, update: {}, create: { id, type: 'CHECKLIST', name: t.name, culturalType: (t as typeof t & { culturalType?: string }).culturalType as never ?? null, isSystem: true, data: t.data } })
  }
  for (const t of budgetTemplates) {
    const id = `sys-budget-${t.name.toLowerCase().replace(/\s+/g, '-')}`
    await db.template.upsert({ where: { id }, update: {}, create: { id, type: 'BUDGET', name: t.name, isSystem: true, data: t.data } })
  }

  const photographyTemplates = [
    {
      name: 'Standard Photography Deliverables',
      data: [
        { title: 'Sneak peek (3–5 edited photos)' },
        { title: 'Full edited photo gallery' },
        { title: 'Highlight video (3–5 min)' },
        { title: 'Full wedding film' },
        { title: 'Printed album' },
      ],
    },
    {
      name: 'Photography + Videography Package',
      data: [
        { title: 'Sneak peek (3–5 edited photos)' },
        { title: 'Full edited photo gallery' },
        { title: 'Highlight reel (Instagram cut)' },
        { title: 'Highlight video (3–5 min)' },
        { title: 'Full wedding film' },
        { title: 'Drone footage edit' },
        { title: 'Printed album' },
        { title: 'USB drive with all files' },
      ],
    },
    {
      name: 'Basic Photography Deliverables',
      data: [
        { title: 'Sneak peek (3–5 edited photos)' },
        { title: 'Full edited photo gallery' },
        { title: 'Printed album' },
      ],
    },
  ]

  for (const t of photographyTemplates) {
    const id = `sys-photography-${t.name.toLowerCase().replace(/[\s()–+]+/g, '-')}`
    await db.template.upsert({ where: { id }, update: {}, create: { id, type: 'PHOTOGRAPHY', name: t.name, isSystem: true, data: t.data } })
  }

  const shotListTemplates = [
    {
      name: 'Full Wedding Shot List',
      data: [
        { title: 'Bride getting ready — detail shots (dress, shoes, rings)', group: 'GETTING_READY' },
        { title: 'Groom getting ready', group: 'GETTING_READY' },
        { title: 'Bridesmaids helping bride', group: 'GETTING_READY' },
        { title: 'Groomsmen with groom', group: 'GETTING_READY' },
        { title: 'First look (if planned)', group: 'GETTING_READY' },
        { title: 'Processional', group: 'CEREMONY' },
        { title: 'Bride entrance', group: 'CEREMONY' },
        { title: 'Exchange of vows', group: 'CEREMONY' },
        { title: 'Ring exchange', group: 'CEREMONY' },
        { title: 'First kiss', group: 'CEREMONY' },
        { title: 'Recessional', group: 'CEREMONY' },
        { title: 'Signing of register', group: 'CEREMONY' },
        { title: 'Couple portraits — outdoor', group: 'PORTRAITS' },
        { title: 'Couple portraits — venue', group: 'PORTRAITS' },
        { title: 'Bridal party group', group: 'PORTRAITS' },
        { title: 'Groomsmen group', group: 'PORTRAITS' },
        { title: 'Bridesmaids group', group: 'PORTRAITS' },
        { title: 'Bride with parents', group: 'FAMILY' },
        { title: 'Groom with parents', group: 'FAMILY' },
        { title: 'Both families together', group: 'FAMILY' },
        { title: 'Siblings', group: 'FAMILY' },
        { title: 'Extended family groups', group: 'FAMILY' },
        { title: 'Venue details — tables, decor, flowers', group: 'RECEPTION' },
        { title: 'Cake cutting', group: 'RECEPTION' },
        { title: 'First dance', group: 'RECEPTION' },
        { title: 'Parent dances', group: 'RECEPTION' },
        { title: 'Speeches', group: 'RECEPTION' },
        { title: 'Bouquet toss', group: 'RECEPTION' },
        { title: 'Guests dancing', group: 'RECEPTION' },
        { title: 'Wedding rings', group: 'DETAILS' },
        { title: 'Bouquet', group: 'DETAILS' },
        { title: 'Invitation suite', group: 'DETAILS' },
        { title: 'Venue exterior', group: 'DETAILS' },
        { title: 'Table settings', group: 'DETAILS' },
        { title: 'Cake detail', group: 'DETAILS' },
      ],
    },
    {
      name: 'Ruracio / Traditional Ceremony Shot List',
      data: [
        { title: 'Ruracio — dowry negotiation', group: 'CULTURAL' },
        { title: 'Ruracio — handover ceremony', group: 'CULTURAL' },
        { title: 'Traditional attire portraits', group: 'CULTURAL' },
        { title: 'Elder blessings', group: 'CULTURAL' },
        { title: 'Cultural dance moments', group: 'CULTURAL' },
        { title: 'Bride with parents', group: 'FAMILY' },
        { title: 'Groom with parents', group: 'FAMILY' },
        { title: 'Both families together', group: 'FAMILY' },
        { title: 'Couple portraits — traditional attire', group: 'PORTRAITS' },
      ],
    },
    {
      name: 'Ceremony Only Shot List',
      data: [
        { title: 'Processional', group: 'CEREMONY' },
        { title: 'Bride entrance', group: 'CEREMONY' },
        { title: 'Exchange of vows', group: 'CEREMONY' },
        { title: 'Ring exchange', group: 'CEREMONY' },
        { title: 'First kiss', group: 'CEREMONY' },
        { title: 'Recessional', group: 'CEREMONY' },
        { title: 'Signing of register', group: 'CEREMONY' },
        { title: 'Couple portraits — outdoor', group: 'PORTRAITS' },
        { title: 'Couple portraits — venue', group: 'PORTRAITS' },
        { title: 'Bride with parents', group: 'FAMILY' },
        { title: 'Groom with parents', group: 'FAMILY' },
        { title: 'Both families together', group: 'FAMILY' },
      ],
    },
  ]

  for (const t of shotListTemplates) {
    const id = `sys-shotlist-${t.name.toLowerCase().replace(/[\s/]+/g, '-')}`
    await db.template.upsert({ where: { id }, update: {}, create: { id, type: 'SHOT_LIST', name: t.name, isSystem: true, data: t.data } })
  }

  console.log('✅ Templates seeded')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
