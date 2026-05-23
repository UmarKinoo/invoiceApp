import { NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayloadClient } from '@/lib/payload-server'

export const dynamic = 'force-dynamic'

/** GET /api/agent/sessions — list conversations for the current user */
export async function GET() {
  const payload = await getPayloadClient()
  const headers = await nextHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await payload.find({
    collection: 'agent-sessions',
    where: { user: { equals: user.id } },
    sort: '-lastMessageAt',
    limit: 50,
    depth: 0,
  })

  return NextResponse.json({
    sessions: result.docs.map((doc) => ({
      id: String(doc.id),
      title: doc.title ?? 'New conversation',
      lastMessageAt: doc.lastMessageAt ?? doc.createdAt,
    })),
  })
}
