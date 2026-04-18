import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const BLOCKED_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// next-auth's withAuth still works — only the file name and export changed in Next.js 16.
// Protect dashboard and authenticated API routes; leave / and /login public.
export const proxy = withAuth(
  function onSuccess(req) {
    // Block mutations for demo users
    const token = req.nextauth.token as { isDemo?: boolean } | null
    if (
      token?.isDemo &&
      BLOCKED_METHODS.has(req.method) &&
      req.nextUrl.pathname.startsWith('/api/')
    ) {
      return NextResponse.json(
        { error: 'Demo mode — mutations are disabled. Sign in with Google to make changes.' },
        { status: 403 }
      )
    }
    return NextResponse.next()
  },
  {
    pages: { signIn: '/login' },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/weddings/:path*',
    '/api/sync/:path*',
    '/api/storage/:path*',
    '/api/templates/:path*',
  ],
}
