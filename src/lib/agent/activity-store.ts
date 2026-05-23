import type { AgentActivity } from './activity'

/** In-memory activity log per thread (fine for single Next.js dev server). */
const byThread = new Map<string, AgentActivity[]>()

export function listThreadActivities(threadId: string): AgentActivity[] {
  return [...(byThread.get(threadId) ?? [])]
}

export function upsertThreadActivity(threadId: string, activity: AgentActivity): void {
  const list = byThread.get(threadId) ?? []
  const idx = list.findIndex((a) => a.id === activity.id)
  if (idx >= 0) list[idx] = activity
  else list.push(activity)
  byThread.set(threadId, list)
}

export function patchThreadActivity(
  threadId: string,
  id: string,
  patch: Partial<AgentActivity>,
): void {
  const list = byThread.get(threadId)
  if (!list) return
  const idx = list.findIndex((a) => a.id === id)
  if (idx < 0) return
  list[idx] = { ...list[idx], ...patch }
}
