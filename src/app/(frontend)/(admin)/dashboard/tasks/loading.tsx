import { PageSkeleton } from '@/components/dashboard/page-skeleton'

export default function TasksLoading() {
  return <PageSkeleton rows={6} hasHeader hasCard />
}
