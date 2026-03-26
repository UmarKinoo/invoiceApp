import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Clears the payload-token cookie (e.g. after detecting a stale session).
 * Call this from a redirect when we can't modify cookies in a Server Component.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next') || '/login'
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
  cookieStore.delete('user-session')
  return NextResponse.redirect(new URL(next, request.url))
}
