'use server'

import { getPayloadClient } from '@/lib/payload-server'
import { revalidatePath } from 'next/cache'

export async function createTask(data: {
  title: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
  client?: number
  completed?: boolean
}): Promise<{ doc?: { id: number }; error?: string }> {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.create({
      collection: 'tasks',
      data: {
        title: data.title,
        dueDate: data.dueDate ?? undefined,
        priority: data.priority ?? 'medium',
        client: data.client ?? undefined,
        completed: data.completed ?? false,
      },
    })
    revalidatePath('/dashboard/tasks')
    return { doc: { id: doc.id as number } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create task' }
  }
}

export async function updateTask(
  id: number,
  data: { completed?: boolean; title?: string; priority?: string; dueDate?: string; client?: number }
): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.update({ collection: 'tasks', id, data: data as any })
    revalidatePath('/dashboard/tasks')
    return { ok: true }
  } catch {
    return { error: 'Failed to update task' }
  }
}

export async function deleteTask(id: number): Promise<{ ok?: true; error?: string }> {
  try {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'tasks', id })
    revalidatePath('/dashboard/tasks')
    return { ok: true }
  } catch {
    return { error: 'Failed to delete task' }
  }
}
