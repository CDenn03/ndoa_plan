import { Spinner } from '@/components/ui'

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )
}
