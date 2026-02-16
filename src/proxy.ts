import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/api/search', '/api/export']
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (isProtected && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (AUTH_ROUTES.includes(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
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
