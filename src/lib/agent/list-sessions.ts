import type { Payload } from 'payload'

export type AgentSessionSummary = {
  id: string
  title: string
  lastMessageAt: string | null
}

export async function listAgentSessionsForUser(
  payload: Payload,
  userId: number,
  limit = 5,
): Promise<AgentSessionSummary[]> {
  const result = await payload.find({
    collection: 'agent-sessions',
    where: { user: { equals: userId } },
    sort: '-lastMessageAt',
    limit,
    depth: 0,
  })

  return result.docs.map((doc) => ({
    id: String(doc.id),
    title: (doc.title as string | undefined) ?? 'New conversation',
    lastMessageAt:
      (doc.lastMessageAt as string | undefined) ??
      (doc.createdAt as string | undefined) ??
      null,
  }))
}
