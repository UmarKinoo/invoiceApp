import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { agentLog } from '@/lib/agent/logger'

export type ChatThreadPayload = {
  threadId?: string
}

export async function resolveAgentThreadId(
  payload: Payload,
  user: User,
  body: ChatThreadPayload,
  lastUserMessage: string,
  requestId: string,
): Promise<string> {
  if (body.threadId) {
    let session
    try {
      session = await payload.findByID({
        collection: 'agent-sessions',
        id: Number(body.threadId),
        depth: 0,
      })
    } catch {
      throw new Error('Thread not found')
    }
    const ownerId = typeof session.user === 'object' ? session.user?.id : session.user
    if (ownerId !== user.id && user.role !== 'admin') {
      throw new Error('Forbidden')
    }
    await payload.update({
      collection: 'agent-sessions',
      id: Number(body.threadId),
      data: { lastMessageAt: new Date().toISOString() },
    })
    return body.threadId
  }

  const created = await payload.create({
    collection: 'agent-sessions',
    data: {
      user: user.id,
      title: lastUserMessage.slice(0, 60),
      lastMessageAt: new Date().toISOString(),
    },
  })
  const threadId = String(created.id)
  agentLog('session.created', { requestId, threadId })
  return threadId
}
