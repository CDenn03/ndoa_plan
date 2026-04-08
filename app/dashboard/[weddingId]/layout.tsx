import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Sidebar, MobileMenuButton } from '@/components/sidebar'
import { SyncProvider } from '@/components/sync-provider'

export default async function DashboardLayout(
  props: {
    children: React.ReactNode
    params: Promise<{ weddingId: string }>
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const userId = (session.user as typeof session.user & { id: string }).id

  const membership = await db.weddingMember.findFirst({
    where: { weddingId: params.weddingId, userId },
    include: { wedding: true },
  })

  if (!membership) notFound()

  return (
    <SyncProvider weddingId={params.weddingId}>
      <div className="flex h-screen overflow-hidden bg-stone-50">
        <Sidebar weddingId={params.weddingId} weddingName={membership.wedding.name} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-white lg:hidden">
            <MobileMenuButton />
            <span className="font-bold text-sm text-[#14161C]">
              {membership.wedding.name}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {children}
          </div>
        </main>
      </div>
    </SyncProvider>
  )
}
