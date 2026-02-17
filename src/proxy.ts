import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/api/search', '/api/export']
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

const NO_STORE = 'private, no-store, no-cache, must-revalidate'

function withNoStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', NO_STORE)
  return res
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (isProtected && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return withNoStore(NextResponse.redirect(url))
  }

  // Don't redirect auth routes to /dashboard based on token existence alone.
  // The token may be expired/invalid, which causes a redirect loop:
  //   proxy sends to /dashboard → layout sees invalid token → redirect to /login →
  //   proxy sends back to /dashboard → loop.
  // Instead, let the page itself call getUser() to validate the token and redirect
  // to /dashboard only when the user is genuinely authenticated.

  return withNoStore(NextResponse.next())
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/search',
    '/api/export/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
}
