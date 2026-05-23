import { NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayloadClient } from '@/lib/payload-server'
import { assertSessionAccess } from '@/lib/agent/session-auth'
import { getThreadHistory } from '@/lib/agent/history'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/agent/sessions/:id/history — hydrate chat UI from checkpoint */
export async function GET(_req: Request, context: RouteContext) {
  const { id: threadId } = await context.params
  const payload = await getPayloadClient()
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await assertSessionAccess(payload, user, threadId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Not found'
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  try {
    const history = await getThreadHistory(threadId)
    return NextResponse.json(history)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
