import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Sidebar, MobileMenuButton } from '@/components/sidebar'
import { SyncProvider } from '@/components/sync-provider'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { weddingId: string }
}) {
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
      <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <Sidebar weddingId={params.weddingId} weddingName={membership.wedding.name} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:hidden">
            <MobileMenuButton />
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
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
