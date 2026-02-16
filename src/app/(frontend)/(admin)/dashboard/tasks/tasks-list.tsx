'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2 } from 'lucide-react'
import type { Task } from '@/payload-types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const PRIORITY_STYLE: Record<string, string> = {
  high: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  medium: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  low: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
}

export function TasksList({
  initialTasks,
}: {
  initialTasks: Task[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const toggleComplete = async (id: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      router.refresh()
    } catch {}
  }

  const handleDelete = async () => {
    if (deleteTaskId == null) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/tasks/${deleteTaskId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId))
      setDeleteTaskId(null)
      router.refresh()
    } catch {
      setDeleteLoading(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Card>
      {tasks.length === 0 ? (
        <CardContent className="p-12 text-center font-medium text-muted-foreground">
          All caught up! No tasks yet.
        </CardContent>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => {
            const client = typeof task.client === 'object' ? task.client : null
            const priority = (task.priority ?? 'medium') as string
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 transition-colors hover:bg-muted/30 ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => toggleComplete(task.id)}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      task.completed
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/50 text-transparent hover:border-primary'
                    }`}
                  >
                    {task.completed && <Check className="size-4" />}
                  </button>
                  <div className="min-w-0">
                    <h4
                      className={`text-sm font-medium ${
                        task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-3">
                      {client && 'name' in client && (
                        <span className="text-xs font-medium text-primary">
                          @ {client.name}
                        </span>
                      )}
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {typeof task.dueDate === 'string'
                          ? task.dueDate.slice(0, 10)
                          : 'No Date'}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${
                          PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.medium
                        }`}
                      >
                        {priority}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteTaskId(task.id)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={deleteTaskId != null} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
