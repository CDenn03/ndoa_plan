/**
 * Seeds rich demo data into the REAL wedding (Jane and John).
 * Run with: pnpm exec tsx prisma/seed-demo.ts
 */
import { PrismaClient } from '../lib/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'
import * as dotenv from 'dotenv'
dotenv.config()

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) })
const WID = '22665423-3b88-40f7-b59f-75ad6e35d103'
const now = new Date()
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86_400_000)

async function main() {
  console.log(`🌱 Seeding demo data into wedding ${WID}...`)

  // ── Guests ────────────────────────────────────────────────────────────────
  const guestData = [
    { name: 'Grace Muthoni',    phone: '+254712101001', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Peter Njoroge',    phone: '+254712101002', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Mary Wambui',      phone: '+254712101003', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'James Kariuki',    phone: '+254712101004', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Faith Nyambura',   phone: '+254712101005', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Samuel Gitau',     phone: '+254712101006', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Esther Wanjiru',   phone: '+254712101007', rsvpStatus: 'CONFIRMED', side: 'BOTH' },
    { name: 'David Mwangi',     phone: '+254712101008', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Ruth Wairimu',     phone: '+254712101009', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Joseph Kamau',     phone: '+254712101010', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Agnes Njeri',      phone: '+254712101011', rsvpStatus: 'CONFIRMED', side: 'BRIDE' },
    { name: 'Charles Kimani',   phone: '+254712101012', rsvpStatus: 'CONFIRMED', side: 'GROOM' },
    { name: 'Lydia Wangari',    phone: '+254712101013', rsvpStatus: 'PENDING',   side: 'BRIDE' },
    { name: "Michael Ndung'u",  phone: '+254712101014', rsvpStatus: 'PENDING',   side: 'GROOM' },
    { name: 'Tabitha Maina',    phone: '+254712101015', rsvpStatus: 'PENDING',   side: 'BOTH'  },
    { name: 'Francis Gacheru',  phone: '+254712101016', rsvpStatus: 'PENDING',   side: 'GROOM' },
    { name: 'Priscilla Waweru', phone: '+254712101017', rsvpStatus: 'PENDING',   side: 'BRIDE' },
    { name: 'Stephen Mugo',     phone: '+254712101018', rsvpStatus: 'DECLINED',  side: 'GROOM' },
    { name: 'Hannah Gathoni',   phone: '+254712101019', rsvpStatus: 'DECLINED',  side: 'BRIDE' },
    { name: 'Daniel Kinyua',    phone: '+254712101020', rsvpStatus: 'MAYBE',     side: 'BOTH'  },
  ]
  for (const g of guestData) {
    await db.guest.upsert({
      where: { id: `g-${g.phone}` },
      update: {},
      create: { id: `g-${g.phone}`, weddingId: WID, ...g, rsvpStatus: g.rsvpStatus as never, side: g.side as never, version: 1, checksum: '' },
    })
  }
  console.log(`  ✓ ${guestData.length} guests`)

  // ── Vendors ───────────────────────────────────────────────────────────────
  const vendorData = [
    { id: 'vd-catering', name: 'Safari Park Catering',   category: 'CATERING',    status: 'CONFIRMED', amount: 550_000, paidAmount: 150_000, contactName: 'Alice Odhiambo', contactPhone: '+254720101001' },
    { id: 'vd-photo',    name: 'Moments Photography',    category: 'PHOTOGRAPHY', status: 'CONFIRMED', amount: 130_000, paidAmount:  65_000, contactName: 'Kevin Otieno',   contactPhone: '+254720101002' },
    { id: 'vd-video',    name: 'Cinematic Films KE',     category: 'VIDEOGRAPHY', status: 'BOOKED',    amount:  90_000, paidAmount:  45_000, contactName: 'Brian Omondi',   contactPhone: '+254720101003' },
    { id: 'vd-florist',  name: 'Bloom & Petal Florals',  category: 'FLORIST',     status: 'BOOKED',    amount:  95_000, paidAmount:  30_000, contactName: 'Mercy Achieng',  contactPhone: '+254720101004' },
    { id: 'vd-dj',       name: 'DJ Smooth Nairobi',      category: 'MUSIC_DJ',    status: 'CONFIRMED', amount:  40_000, paidAmount:  20_000, contactName: 'DJ Smooth',      contactPhone: '+254720101005' },
    { id: 'vd-transport',name: 'Royal Coaches Ltd',      category: 'TRANSPORT',   status: 'BOOKED',    amount:  55_000, paidAmount:  20_000, contactName: 'Tom Wekesa',     contactPhone: '+254720101006' },
    { id: 'vd-cake',     name: 'Sweet Creations Bakery', category: 'CAKE',        status: 'QUOTED',    amount:  28_000, paidAmount:       0, contactName: 'Purity Njoki',   contactPhone: '+254720101007' },
    { id: 'vd-makeup',   name: 'Glam by Zawadi',         category: 'HAIR_MAKEUP', status: 'CONFIRMED', amount:  35_000, paidAmount:  15_000, contactName: 'Zawadi Auma',    contactPhone: '+254720101008' },
  ]
  for (const v of vendorData) {
    await db.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: { ...v, weddingId: WID, category: v.category as never, status: v.status as never, version: 1, checksum: '' },
    })
  }
  console.log(`  ✓ ${vendorData.length} vendors`)

  // ── Contributions ─────────────────────────────────────────────────────────
  const contribData = [
    { id: 'cc-001', memberName: 'Kamau Family',    memberId: 'mb-001', pledgeAmount: 80_000, paidAmount: 80_000, status: 'FULFILLED' },
    { id: 'cc-002', memberName: 'Njoroge Family',  memberId: 'mb-002', pledgeAmount: 60_000, paidAmount: 60_000, status: 'FULFILLED' },
    { id: 'cc-003', memberName: 'Wambui Muthoni',  memberId: 'mb-003', pledgeAmount: 30_000, paidAmount: 20_000, status: 'PARTIAL'   },
    { id: 'cc-004', memberName: 'Gitau & Sons',    memberId: 'mb-004', pledgeAmount: 50_000, paidAmount: 50_000, status: 'FULFILLED' },
    { id: 'cc-005', memberName: 'Kariuki Clan',    memberId: 'mb-005', pledgeAmount: 40_000, paidAmount:      0, status: 'PLEDGED',  dueDate: d(30) },
    { id: 'cc-006', memberName: 'Nyambura Grace',  memberId: 'mb-006', pledgeAmount: 15_000, paidAmount: 15_000, status: 'FULFILLED' },
    { id: 'cc-007', memberName: 'Mwangi Brothers', memberId: 'mb-007', pledgeAmount: 25_000, paidAmount: 10_000, status: 'PARTIAL'   },
    { id: 'cc-008', memberName: 'Wairimu Esther',  memberId: 'mb-008', pledgeAmount: 20_000, paidAmount:      0, status: 'OVERDUE',  dueDate: d(-5) },
  ]
  for (const c of contribData) {
    await db.committeeContribution.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, weddingId: WID, status: c.status as never, dueDate: c.dueDate ?? null },
    })
  }
  console.log(`  ✓ ${contribData.length} contributions`)

  // ── Checklist Items ───────────────────────────────────────────────────────
  const checklistData = [
    { id: 'ck-001', title: 'Confirm final guest headcount with caterer', category: 'CATERING',     dueDate: d(-3), priority: 1 },
    { id: 'ck-002', title: 'Send remaining invitations (15 pending)',    category: 'INVITATIONS',  dueDate: d(-1), priority: 1 },
    { id: 'ck-003', title: 'Final dress fitting',                        category: 'ATTIRE',       dueDate: d(5),  priority: 1 },
    { id: 'ck-004', title: 'Confirm DJ playlist and do-not-play list',   category: 'MUSIC',        dueDate: d(7),  priority: 2 },
    { id: 'ck-005', title: 'Book honeymoon accommodation (Diani)',       category: 'HONEYMOON',    dueDate: d(10), priority: 2 },
    { id: 'ck-006', title: 'Collect marriage certificate requirements',  category: 'LEGAL',        dueDate: d(14), priority: 1 },
    { id: 'ck-007', title: 'Confirm transport pickup points and times',  category: 'TRANSPORT',    dueDate: d(14), priority: 1 },
    { id: 'ck-008', title: 'Order wedding cake (final design approval)', category: 'CAKE',         dueDate: d(21), priority: 2 },
    { id: 'ck-009', title: 'Prepare seating plan',                       category: 'OTHER',        dueDate: d(21), priority: 2 },
    { id: 'ck-010', title: 'Confirm florist delivery time and setup',    category: 'DECORATIONS',  dueDate: d(28), priority: 1 },
  ]
  for (const c of checklistData) {
    await db.checklistItem.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, weddingId: WID, isChecked: false, version: 1, checksum: '' },
    })
  }
  console.log(`  ✓ ${checklistData.length} checklist items`)

  // ── Risk Alerts ───────────────────────────────────────────────────────────
  const riskData = [
    { id: 'rk-001', ruleId: 'budget-overrun',      severity: 'HIGH',   category: 'budget',   message: 'Attire spend has exceeded the estimated budget by 82%. Review remaining attire costs.' },
    { id: 'rk-002', ruleId: 'rsvp-low',            severity: 'MEDIUM', category: 'guests',   message: '5 guests have not responded to invitations with less than 30 days to the Traditional Ceremony.' },
    { id: 'rk-003', ruleId: 'contrib-overdue',     severity: 'HIGH',   category: 'payments', message: "Wairimu Esther's contribution of KES 20,000 is 5 days overdue. Contact required." },
    { id: 'rk-004', ruleId: 'vendor-unconfirmed',  severity: 'LOW',    category: 'vendor',   message: 'Sweet Creations Bakery is still at QUOTED status. Confirm booking before the 30-day deadline.' },
  ]
  for (const r of riskData) {
    await db.riskAlert.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, weddingId: WID, severity: r.severity as never, isResolved: false },
    })
  }
  console.log(`  ✓ ${riskData.length} risk alerts`)

  // ── Next Appointment (replace existing ones with a near-term one) ─────────
  await db.appointment.upsert({
    where: { id: 'ap-demo-001' },
    update: {},
    create: {
      id: 'ap-demo-001', weddingId: WID,
      title: 'Final dress fitting — Bridal Boutique',
      startAt: d(5), endAt: new Date(d(5).getTime() + 2 * 3_600_000),
      location: 'Bridal Boutique, Westlands', status: 'SCHEDULED',
      createdBy: (await db.weddingMember.findFirst({ where: { weddingId: WID } }))?.userId ?? 'system',
      notes: 'Bring wedding shoes and undergarments.',
    },
  })
  console.log('  ✓ next appointment')

  console.log('\n✅ Done. Refresh /dashboard/22665423-3b88-40f7-b59f-75ad6e35d103')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
