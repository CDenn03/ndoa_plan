import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function proxy(req) {
    // Allow all authenticated requests through
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Public routes — no auth required
        if (
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/mpesa/callback') || // Safaricom hits this directly
          pathname === '/_next' ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/public/') ||
          pathname === '/manifest.json' ||
          pathname.startsWith('/icon')
        ) {
          return true
        }
        // All other routes require a valid token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json).*)',
  ],
}
