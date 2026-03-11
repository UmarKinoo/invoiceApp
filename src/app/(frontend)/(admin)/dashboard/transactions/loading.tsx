import { PageSkeleton } from '@/components/dashboard/page-skeleton'

export default function TransactionsLoading() {
  return <PageSkeleton rows={6} hasHeader hasCard />
}
