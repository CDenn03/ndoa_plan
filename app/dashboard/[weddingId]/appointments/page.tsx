'use client'
import { use } from 'react'
import { AppointmentsClient } from './appointments-client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Spinner } from '@/components/ui'

interface Vendor { id: string; name: string; category: string }

export default function AppointmentsPage(props: Readonly<{ params: Promise<{ weddingId: string }> }>) {
  const params = use(props.params)
  const wid = params.weddingId
  const { data: session } = useSession()
  const userId = (session?.user as typeof session.user & { id?: string })?.id ?? ''

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors', wid, 'select'],
    queryFn: async () => {
      const res = await fetch(`/api/weddings/${wid}/vendors`)
      if (!res.ok) return []
      return res.json() as Promise<Vendor[]>
    },
    staleTime: 60_000,
  })

  if (!userId) return <div className="flex justify-center py-20"><Spinner /></div>

  return <AppointmentsClient weddingId={wid} userId={userId} vendors={vendors} />
}
