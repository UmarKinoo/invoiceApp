import type { Payload } from 'payload'
import type { User } from '@/payload-types'

export async function assertSessionAccess(
  payload: Payload,
  user: User,
  threadId: string,
): Promise<void> {
  let session
  try {
    session = await payload.findByID({
      collection: 'agent-sessions',
      id: Number(threadId),
      depth: 0,
    })
  } catch {
    throw new Error('Not found')
  }
  const ownerId = typeof session.user === 'object' ? session.user?.id : session.user
  if (ownerId !== user.id && user.role !== 'admin') {
    throw new Error('Forbidden')
  }
}
