'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-8">
      <AlertTriangle size={32} className="text-amber-400 mb-4" />
      <h2 className="text-lg font-bold text-[#14161C] mb-1">Something went wrong</h2>
      <p className="text-sm text-zinc-400 mb-5">{error.message ?? 'An unexpected error occurred'}</p>
      <Button onClick={reset} variant="secondary" size="sm">Try again</Button>
    </div>
  )
}
