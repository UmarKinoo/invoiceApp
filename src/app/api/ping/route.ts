import { createClient } from '@supabase/supabase-js'

/**
 * Ping endpoint for Vercel Cron. Runs a tiny query so Supabase (free tier) stays active.
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY, and a table "health_check" with at least one row.
 * Create it in Supabase SQL: CREATE TABLE health_check (id serial PRIMARY KEY);
 * INSERT INTO health_check (id) VALUES (1);
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return Response.json(
      { status: 'error', error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' },
      { status: 500 }
    )
  }

  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase
    .from('health_check')
    .select('*')
    .limit(1)

  return Response.json({
    status: 'ok',
    data,
    error: error?.message ?? null,
  })
}
