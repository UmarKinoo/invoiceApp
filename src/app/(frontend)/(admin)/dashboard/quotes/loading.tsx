import { PageSkeleton } from '@/components/dashboard/page-skeleton'

export default function QuotesLoading() {
  return <PageSkeleton rows={6} hasHeader hasCard />
}
