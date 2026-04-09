import { PrismaClient } from '../lib/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'
import * as dotenv from 'dotenv'

dotenv.config()

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  console.log('🌱 Seeding database...')

  // Create a demo user
  const user = await db.user.upsert({
    where: { email: 'demo@ndoa.app' },
    update: {},
    create: {
      email: 'demo@ndoa.app',
      name: 'Demo User',
      role: 'COUPLE',
    },
  })

  // Create a demo wedding
  const wedding = await db.wedding.upsert({
    where: { id: 'demo-wedding-id' },
    update: {},
    create: {
      id: 'demo-wedding-id',
      name: "John & Jane's Wedding",
      date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      venue: 'Safari Park Hotel, Nairobi',
      venueCapacity: 300,
      budget: 1_500_000, // 1.5M KES
      culturalType: 'KIKUYU',
      themeColor: '#8B5CF6',
      members: {
        create: { userId: user.id, role: 'COUPLE' },
      },
    },
  })

  // Sample vendors
  await db.vendor.createMany({
    skipDuplicates: true,
    data: [
      { weddingId: wedding.id, name: 'Safari Park Catering', category: 'CATERING', status: 'CONFIRMED', amount: 450_000, paidAmount: 100_000, contactPhone: '+254712000001', version: 1, checksum: '' },
      { weddingId: wedding.id, name: 'Moments Photography', category: 'PHOTOGRAPHY', status: 'BOOKED', amount: 120_000, paidAmount: 60_000, contactPhone: '+254712000002', version: 1, checksum: '' },
      { weddingId: wedding.id, name: 'Bloom Florals', category: 'FLORIST', status: 'QUOTED', amount: 80_000, paidAmount: 0, contactPhone: '+254712000003', version: 1, checksum: '' },
      { weddingId: wedding.id, name: 'DJ Smooth', category: 'MUSIC_DJ', status: 'ENQUIRED', amount: 35_000, paidAmount: 0, contactPhone: '+254712000004', version: 1, checksum: '' },
      { weddingId: wedding.id, name: 'Royal Transport', category: 'TRANSPORT', status: 'BOOKED', amount: 45_000, paidAmount: 20_000, version: 1, checksum: '' },
    ],
  })

  // Sample guests
  await db.guest.createMany({
    skipDuplicates: true,
    data: Array.from({ length: 20 }, (_, i) => ({
      weddingId: wedding.id,
      name: `Guest ${i + 1}`,
      phone: `+2547${String(10000000 + i).padStart(8, '0')}`,
      rsvpStatus: i < 12 ? 'CONFIRMED' : i < 16 ? 'PENDING' : 'DECLINED',
      side: i % 3 === 0 ? 'BRIDE' : i % 3 === 1 ? 'GROOM' : 'BOTH',
      version: 1,
      checksum: '',
    })),
  })

  // Sample budget lines
  await db.budgetLine.createMany({
    skipDuplicates: true,
    data: [
      { weddingId: wedding.id, category: 'CATERING', description: 'Food and beverages', estimated: 450_000, committed: 450_000, actual: 100_000, version: 1, checksum: '' },
      { weddingId: wedding.id, category: 'PHOTOGRAPHY', description: 'Photography + videography', estimated: 150_000, committed: 120_000, actual: 60_000, version: 1, checksum: '' },
      { weddingId: wedding.id, category: 'DECORATIONS', description: 'Flowers and decor', estimated: 120_000, committed: 80_000, actual: 0, version: 1, checksum: '' },
      { weddingId: wedding.id, category: 'MUSIC', description: 'DJ services', estimated: 50_000, committed: 35_000, actual: 0, version: 1, checksum: '' },
      { weddingId: wedding.id, category: 'TRANSPORT', description: 'Bridal car and buses', estimated: 60_000, committed: 45_000, actual: 20_000, version: 1, checksum: '' },
      { weddingId: wedding.id, category: 'ATTIRE', description: 'Wedding dress and suits', estimated: 200_000, committed: 150_000, actual: 150_000, version: 1, checksum: '' },
    ],
  })

  console.log('✅ Seed complete')
  console.log(`   Wedding ID: ${wedding.id}`)
  console.log(`   Demo user:  demo@ndoa.app`)

  // ─── System Templates ────────────────────────────────────────────────────────
  console.log('🌱 Seeding system templates...')

  const checklistTemplates = [
    {
      name: '12-Month Master Checklist',
      data: [
        { title: 'Set overall wedding budget', category: 'LEGAL', priority: 1 },
        { title: 'Decide on wedding size (intimate / medium / large)', category: 'OTHER', priority: 1 },
        { title: 'Allocate budget by category', category: 'OTHER', priority: 1 },
        { title: 'Open a dedicated wedding savings account', category: 'LEGAL', priority: 2 },
        { title: 'Choose wedding date', category: 'OTHER', priority: 1 },
        { title: 'Book main venue', category: 'VENUE', priority: 1 },
        { title: 'Create guest list (first draft)', category: 'OTHER', priority: 1 },
        { title: 'Book officiant / pastor / kadhi', category: 'LEGAL', priority: 1 },
        { title: 'Book photographer', category: 'PHOTOGRAPHY', priority: 1 },
        { title: 'Book videographer', category: 'PHOTOGRAPHY', priority: 2 },
        { title: 'Book caterer', category: 'CATERING', priority: 1 },
        { title: 'Book DJ / band', category: 'MUSIC', priority: 2 },
        { title: 'Send save-the-dates', category: 'INVITATIONS', priority: 2 },
        { title: 'Order wedding dress / attire', category: 'ATTIRE', priority: 1 },
        { title: 'Book hair & makeup artist', category: 'ATTIRE', priority: 1 },
        { title: 'Book florist', category: 'DECORATIONS', priority: 2 },
        { title: 'Book transport (bridal car, guest buses)', category: 'TRANSPORT', priority: 2 },
        { title: 'Send formal invitations', category: 'INVITATIONS', priority: 1 },
        { title: 'Arrange accommodation for out-of-town guests', category: 'ACCOMMODATION', priority: 2 },
        { title: 'Plan honeymoon', category: 'HONEYMOON', priority: 2 },
        { title: 'Confirm all vendor bookings', category: 'OTHER', priority: 1 },
        { title: 'Final dress fitting', category: 'ATTIRE', priority: 1 },
        { title: 'Confirm guest RSVPs and final headcount', category: 'OTHER', priority: 1 },
        { title: 'Confirm catering final menu and headcount', category: 'CATERING', priority: 1 },
        { title: 'Prepare seating plan', category: 'OTHER', priority: 2 },
        { title: 'Prepare wedding day timeline', category: 'OTHER', priority: 1 },
        { title: 'Collect marriage certificate requirements', category: 'LEGAL', priority: 1 },
        { title: 'Bride preparation', category: 'ATTIRE', priority: 1 },
        { title: 'Groom preparation', category: 'ATTIRE', priority: 1 },
        { title: 'Venue setup check', category: 'VENUE', priority: 1 },
        { title: 'Confirm all vendors have arrived', category: 'OTHER', priority: 1, isFinalCheck: true },
        { title: 'Ceremony complete', category: 'OTHER', priority: 1, isFinalCheck: true },
        { title: 'Send thank-you notes to guests', category: 'OTHER', priority: 1 },
        { title: 'Return rented items', category: 'OTHER', priority: 2 },
        { title: 'Register marriage certificate', category: 'LEGAL', priority: 1 },
        { title: 'Review and pay final vendor invoices', category: 'OTHER', priority: 1 },
      ],
    },
    {
      name: 'Ruracio Ceremony Checklist',
      culturalType: 'KIKUYU',
      data: [
        { title: 'Agree on Ruracio date with both families', category: 'LEGAL', priority: 1 },
        { title: 'Prepare dowry list (bride price items)', category: 'OTHER', priority: 1 },
        { title: 'Book venue for Ruracio', category: 'VENUE', priority: 1 },
        { title: 'Arrange catering for Ruracio guests', category: 'CATERING', priority: 1 },
        { title: 'Prepare traditional attire (Kikuyu)', category: 'ATTIRE', priority: 1 },
        { title: 'Confirm elders / spokespersons for negotiation', category: 'OTHER', priority: 1 },
        { title: "Prepare gifts for bride's family", category: 'OTHER', priority: 2 },
        { title: 'Ruracio ceremony complete', category: 'OTHER', priority: 1, isFinalCheck: true },
        { title: 'Dowry items delivered and acknowledged', category: 'OTHER', priority: 1, isFinalCheck: true },
      ],
    },
    {
      name: 'Wedding Day Checklist',
      data: [
        { title: 'Wake up and have breakfast', category: 'OTHER', priority: 1 },
        { title: 'Hair & makeup — bride', category: 'ATTIRE', priority: 1 },
        { title: 'Groom and groomsmen dressed', category: 'ATTIRE', priority: 1 },
        { title: 'Bouquets and buttonholes collected', category: 'DECORATIONS', priority: 1 },
        { title: 'Venue decorated and ready', category: 'VENUE', priority: 1 },
        { title: 'Photographer briefed', category: 'PHOTOGRAPHY', priority: 1 },
        { title: 'Caterer confirmed on-site', category: 'CATERING', priority: 1 },
        { title: 'DJ / band set up and sound-checked', category: 'MUSIC', priority: 1 },
        { title: 'Transport confirmed and on schedule', category: 'TRANSPORT', priority: 1 },
        { title: 'All vendors confirmed on-site', category: 'OTHER', priority: 1, isFinalCheck: true },
        { title: 'Ceremony complete', category: 'OTHER', priority: 1, isFinalCheck: true },
        { title: 'Rings exchanged', category: 'OTHER', priority: 1, isFinalCheck: true },
      ],
    },
    {
      name: 'Bride Preparation Checklist',
      data: [
        { title: 'Book hair & makeup trial', category: 'ATTIRE', priority: 1 },
        { title: 'First dress fitting', category: 'ATTIRE', priority: 1 },
        { title: 'Second dress fitting', category: 'ATTIRE', priority: 1 },
        { title: 'Final dress fitting', category: 'ATTIRE', priority: 1, isFinalCheck: true },
        { title: 'Choose bridesmaids attire', category: 'ATTIRE', priority: 2 },
        { title: 'Buy wedding shoes', category: 'ATTIRE', priority: 2 },
        { title: 'Buy wedding jewellery', category: 'ATTIRE', priority: 2 },
        { title: 'Bridal shower', category: 'OTHER', priority: 3 },
        { title: 'Confirm hair & makeup for wedding day', category: 'ATTIRE', priority: 1 },
      ],
    },
  ]

  const budgetTemplates = [
    {
      name: 'Standard Wedding Budget',
      data: [
        { category: 'CATERING', description: 'Food and beverages', estimated: 675_000 },
        { category: 'VENUE', description: 'Venue hire', estimated: 300_000 },
        { category: 'DECORATIONS', description: 'Decor and flowers', estimated: 150_000 },
        { category: 'PHOTOGRAPHY', description: 'Photography', estimated: 120_000 },
        { category: 'VIDEOGRAPHY', description: 'Videography', estimated: 80_000 },
        { category: 'ATTIRE', description: 'Wedding dress and suits', estimated: 200_000 },
        { category: 'MUSIC', description: 'DJ / band', estimated: 60_000 },
        { category: 'TRANSPORT', description: 'Bridal car and guest transport', estimated: 75_000 },
        { category: 'INVITATIONS', description: 'Invitations and stationery', estimated: 20_000 },
        { category: 'CAKE', description: 'Wedding cake', estimated: 30_000 },
        { category: 'MISCELLANEOUS', description: 'Contingency buffer', estimated: 50_000 },
      ],
    },
    {
      name: 'Traditional Ceremony Budget',
      data: [
        { category: 'CATERING', description: 'Traditional food and drinks', estimated: 200_000 },
        { category: 'VENUE', description: 'Family compound / venue', estimated: 50_000 },
        { category: 'ATTIRE', description: 'Traditional attire (Ankara / Kitenge)', estimated: 80_000 },
        { category: 'DECORATIONS', description: 'Traditional decor', estimated: 40_000 },
        { category: 'TRANSPORT', description: 'Guest transport', estimated: 30_000 },
        { category: 'MISCELLANEOUS', description: 'Dowry items and gifts', estimated: 100_000 },
      ],
    },
  ]

  for (const t of checklistTemplates) {
    const id = `sys-checklist-${t.name.toLowerCase().replace(/[\s']+/g, '-')}`
    await db.template.upsert({
      where: { id },
      update: {},
      create: {
        id,
        type: 'CHECKLIST',
        name: t.name,
        culturalType: (t as typeof t & { culturalType?: string }).culturalType as never ?? null,
        isSystem: true,
        data: t.data,
      },
    })
  }

  for (const t of budgetTemplates) {
    const id = `sys-budget-${t.name.toLowerCase().replace(/\s+/g, '-')}`
    await db.template.upsert({
      where: { id },
      update: {},
      create: {
        id,
        type: 'BUDGET',
        name: t.name,
        isSystem: true,
        data: t.data,
      },
    })
  }

  // ─── Appointment Templates ───────────────────────────────────────────────────
  const appointmentTemplates = [
    {
      name: 'Venue Visits',
      data: [
        { title: 'Visit main reception venue', location: 'TBD', notes: 'Check capacity, parking, catering kitchen, AV setup', offsetDays: 0 },
        { title: 'Visit backup / outdoor venue', location: 'TBD', notes: 'Confirm rain contingency plan', offsetDays: 3 },
        { title: 'Final venue walkthrough', location: 'Main venue', notes: 'Confirm layout, seating plan, decor placement', offsetDays: 60 },
      ],
    },
    {
      name: 'Vendor Meetings',
      data: [
        { title: 'Caterer tasting & menu finalisation', notes: 'Bring guest dietary requirements list', offsetDays: 0 },
        { title: 'Photographer portfolio review & contract signing', notes: 'Discuss shot list, timeline, second shooter', offsetDays: 2 },
        { title: 'Florist consultation', notes: 'Bring colour palette and inspiration photos', offsetDays: 5 },
        { title: 'DJ / band audition & playlist briefing', notes: 'Share must-play and do-not-play lists', offsetDays: 7 },
        { title: 'Transport provider briefing', notes: 'Confirm pickup points, times, and vehicle count', offsetDays: 10 },
        { title: 'Cake tasting', notes: 'Decide on flavours and design', offsetDays: 14 },
      ],
    },
    {
      name: 'Attire & Beauty',
      data: [
        { title: 'Bridal boutique — first dress appointment', notes: 'Bring 2-3 trusted people, wear nude underwear', offsetDays: 0 },
        { title: 'First dress fitting', notes: 'Bring wedding shoes and undergarments', offsetDays: 30 },
        { title: 'Second dress fitting', notes: 'Check alterations from first fitting', offsetDays: 50 },
        { title: 'Final dress fitting & collection', notes: 'Confirm dress is ready to take home', offsetDays: 65 },
        { title: 'Hair & makeup trial', notes: 'Bring inspiration photos, test full look', offsetDays: 20 },
        { title: 'Groom suit fitting', notes: 'Confirm suit, shirt, tie, and shoes', offsetDays: 10 },
      ],
    },
    {
      name: 'Legal & Admin',
      data: [
        { title: 'Marriage registration office — document check', location: 'Attorney General offices', notes: 'Bring IDs, birth certificates, passport photos', offsetDays: 0 },
        { title: 'Marriage licence application', location: 'Attorney General offices', notes: 'Submit all required documents', offsetDays: 7 },
        { title: 'Collect marriage certificate', location: 'Attorney General offices', notes: 'Confirm certificate is ready before collecting', offsetDays: 30 },
      ],
    },
    {
      name: 'Ruracio Planning',
      culturalType: 'KIKUYU',
      data: [
        { title: 'Family meeting — agree on Ruracio date', notes: 'Both families present; agree on venue and guest count', offsetDays: 0 },
        { title: "Visit bride's family home", notes: 'Formal introduction of groom delegation', offsetDays: 7 },
        { title: 'Dowry negotiation meeting', notes: 'Bring elders / spokesperson; prepare dowry list', offsetDays: 14 },
        { title: 'Ruracio ceremony rehearsal', notes: 'Confirm order of events, roles, and gifts', offsetDays: 21 },
      ],
    },
    {
      name: 'Wedding Week',
      data: [
        { title: 'Final vendor confirmation calls', notes: 'Call every vendor to confirm time, location, and requirements', offsetDays: 0 },
        { title: 'Rehearsal dinner', notes: 'Run through ceremony order with wedding party', offsetDays: 2 },
        { title: 'Bridal party prep briefing', notes: 'Share final timeline, emergency contacts, and roles', offsetDays: 3 },
        { title: 'Venue setup supervision', notes: 'Arrive early to oversee decor and seating setup', offsetDays: 4 },
      ],
    },
  ]

  for (const t of appointmentTemplates) {
    const id = `sys-appointment-${t.name.toLowerCase().replace(/[\s&]+/g, '-')}`
    await db.template.upsert({
      where: { id },
      update: { data: t.data },
      create: {
        id,
        type: 'APPOINTMENT',
        name: t.name,
        culturalType: (t as typeof t & { culturalType?: string }).culturalType as never ?? null,
        isSystem: true,
        data: t.data,
      },
    })
  }

  console.log('✅ Templates seeded')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
