import { redirect } from 'next/navigation'

export default async function EventDetailPage(props: Readonly<{ params: Promise<{ weddingId: string; eventId: string }> }>) {
  const params = await props.params
  const { weddingId, eventId } = params

  // Redirect to profile as the default landing page
  redirect(`/dashboard/${weddingId}/events/${eventId}/profile`)
}
