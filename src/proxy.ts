import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set([
  '/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/google',
  '/api/auth/google/callback',
])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('fh-session')?.value
  const expected = process.env.APP_SECRET || 'change-me-in-env-local'
  const authenticated = token === expected

  if (PUBLIC_PATHS.has(pathname)) {
    if (authenticated && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
