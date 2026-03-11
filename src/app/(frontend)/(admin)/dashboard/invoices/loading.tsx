import { PageSkeleton } from '@/components/dashboard/page-skeleton'

export default function InvoicesLoading() {
  return <PageSkeleton rows={8} hasHeader hasCard />
}
