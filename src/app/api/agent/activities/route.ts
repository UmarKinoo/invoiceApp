import { NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayloadClient } from '@/lib/payload-server'
import { listThreadActivities } from '@/lib/agent/activity-store'

export const dynamic = 'force-dynamic'

/** GET /api/agent/activities?threadId=4 — sidebar poll / hydrate on load */
export async function GET(req: Request) {
  const payload = await getPayloadClient()
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threadId = new URL(req.url).searchParams.get('threadId')
  if (!threadId) {
    return NextResponse.json({ error: 'threadId required' }, { status: 400 })
  }

  try {
    const session = await payload.findByID({
      collection: 'agent-sessions',
      id: Number(threadId),
      depth: 0,
    })
    const ownerId = typeof session.user === 'object' ? session.user?.id : session.user
    if (ownerId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  return NextResponse.json({ activities: listThreadActivities(threadId) })
}
