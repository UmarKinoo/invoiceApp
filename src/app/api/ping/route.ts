import { getPayloadClient } from '@/lib/payload-server'

// Ping for Vercel Cron: tiny DB query so Supabase (free tier) stays active.
// Uses DATABASE_URI; schedule in vercel.json (e.g. every 6 hours).
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const result = await payload.count({ collection: 'users' })
    return Response.json({
      status: 'ok',
      db: 'connected',
      users_count: result?.totalDocs ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json(
      { status: 'error', error: message },
      { status: 500 }
    )
  }
}
