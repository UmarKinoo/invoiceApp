import type { AgentActivity, ActivityStatus } from './activity'
import { createActivity } from './activity'
import { listThreadActivities, patchThreadActivity, upsertThreadActivity } from './activity-store'

export function publishActivity(
  controller: { enqueue: (chunk: Uint8Array) => void },
  encode: (event: Record<string, unknown>) => Uint8Array,
  threadId: string,
  id: string,
  patch: {
    label?: string
    status?: ActivityStatus
    tool?: string
    detail?: string
  },
): AgentActivity {
  const existing = listThreadActivities(threadId).find((a) => a.id === id)
  const next: AgentActivity = existing
    ? {
        ...existing,
        ...patch,
        completedAt:
          patch.status === 'completed' || patch.status === 'error'
            ? Date.now()
            : existing.completedAt,
      }
    : createActivity({
        id,
        label: patch.label ?? id,
        status: patch.status ?? 'pending',
        tool: patch.tool,
        detail: patch.detail,
      })

  if (existing) patchThreadActivity(threadId, id, next)
  else upsertThreadActivity(threadId, next)

  controller.enqueue(encode({ type: 'activity', activity: next }))
  return next
}

export function activityIdForTool(name: string, suffix?: string): string {
  return `tool-${name}-${suffix ?? Date.now()}`
}

export const THINKING_ACTIVITY_ID = 'thinking'
