import { PrismaClient } from '../lib/generated/prisma'

const db = new PrismaClient()

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
      tableNumber: i < 12 ? Math.ceil((i + 1) / 4) : null,
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

  // Sample timeline
  const weddingDate = wedding.date
  const setTime = (h: number, m = 0) => new Date(new Date(weddingDate).setHours(h, m, 0, 0))

  await db.timelineEvent.createMany({
    skipDuplicates: true,
    data: [
      { weddingId: wedding.id, title: 'Bride arrives', startTime: setTime(9, 0), endTime: setTime(9, 30), location: 'Main entrance', color: '#EC4899', isComplete: false, version: 1, checksum: '' },
      { weddingId: wedding.id, title: 'Ceremony begins', startTime: setTime(10, 0), endTime: setTime(11, 0), location: 'Main hall', color: '#8B5CF6', isComplete: false, version: 1, checksum: '' },
      { weddingId: wedding.id, title: 'Photo session', startTime: setTime(11, 0), endTime: setTime(12, 30), location: 'Gardens', color: '#3B82F6', isComplete: false, version: 1, checksum: '' },
      { weddingId: wedding.id, title: 'Reception lunch', startTime: setTime(13, 0), endTime: setTime(16, 0), location: 'Ballroom', color: '#F59E0B', isComplete: false, version: 1, checksum: '' },
      { weddingId: wedding.id, title: 'First dance', startTime: setTime(16, 30), endTime: setTime(17, 0), location: 'Ballroom', color: '#EC4899', isComplete: false, version: 1, checksum: '' },
      { weddingId: wedding.id, title: 'Evening entertainment', startTime: setTime(18, 0), endTime: setTime(23, 0), location: 'Ballroom', color: '#10B981', isComplete: false, version: 1, checksum: '' },
    ],
  })

  console.log('✅ Seed complete')
  console.log(`   Wedding ID: ${wedding.id}`)
  console.log(`   Demo user:  demo@ndoa.app`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
