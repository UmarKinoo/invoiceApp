import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload-server'
import { TasksList } from './tasks-list'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import type { Task } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  let tasks: Task[] = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'tasks', limit: 200, depth: 1 })
    tasks = (res.docs ?? []) as Task[]
  } catch {
    tasks = []
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Tasks"
        description="Manage follow-ups and CRM duties."
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/tasks/new">
              <Plus className="size-4 lg:mr-0" />
              <span className="hidden lg:inline">Add Task</span>
            </Link>
          </Button>
        }
      />
      <TasksList initialTasks={tasks} />
    </div>
  )
}
