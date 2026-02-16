import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AddTaskForm } from '../add-task-form'

export default function NewTaskPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard/tasks"
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter">New Task</h2>
          <p className="text-sm text-muted-foreground">Add a task.</p>
        </div>
      </header>
      <AddTaskForm />
    </div>
  )
}
