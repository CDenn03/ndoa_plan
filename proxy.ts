import { withAuth } from 'next-auth/middleware'

// next-auth's withAuth still works — only the file name and export changed in Next.js 16.
// Protect dashboard and authenticated API routes; leave / and /login public.
export const proxy = withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/weddings/:path*',
    '/api/sync/:path*',
    '/api/storage/:path*',
    '/api/templates/:path*',
  ],
}
