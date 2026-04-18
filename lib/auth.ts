import { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'

const DEMO_EMAIL = 'demo@ndoa.app'
const DEMO_PASSWORD = 'tryndoa2026'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { prompt: 'select_account' },
      },
    }),
    CredentialsProvider({
      id: 'demo',
      name: 'Demo',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (
          credentials?.email === DEMO_EMAIL &&
          credentials?.password === DEMO_PASSWORD
        ) {
          // Find or create the demo user
          let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } })
          if (!user) {
            user = await db.user.create({
              data: { email: DEMO_EMAIL, name: 'Demo User', role: 'COUPLE' },
            })
          }
          return { id: user.id, email: user.email, name: user.name, isDemo: true }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.isDemo = (user as typeof user & { isDemo?: boolean }).isDemo ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string; isDemo: boolean }).id = token.userId as string;
        (session.user as typeof session.user & { id: string; isDemo: boolean }).isDemo = (token.isDemo as boolean) ?? false
      }
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
}

export async function getServerSession(req?: Request) {
  // Server-side session getter for API routes
  const { getServerSession: gss } = await import('next-auth')
  return gss(authOptions)
}
