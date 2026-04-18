'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui'

export function LoginClient() {
  const handleDemo = () => {
    void signIn('demo', { email: 'demo@ndoa.app', password: 'tryndoa2026', callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#1F4D3A]/6 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#D4A94F]/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1F4D3A] mb-5 shadow-lg shadow-[#1F4D3A]/20">
            <span className="text-white text-xl font-heading font-bold">N</span>
          </div>
          <h1 className="font-heading text-4xl font-semibold text-[#1F4D3A] tracking-tight">Ndoa</h1>
          <p className="text-[#14161C]/45 mt-2 text-sm">The operating system for your wedding</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#1F4D3A]/10 rounded-2xl p-8 shadow-sm space-y-3">
          <h2 className="font-heading text-lg font-semibold text-[#14161C] mb-1">Welcome back</h2>
          <p className="text-sm text-[#14161C]/45 mb-6">Sign in to manage your wedding</p>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#1F4D3A]/8" />
            <span className="text-xs text-[#14161C]/30 font-medium">or</span>
            <div className="flex-1 h-px bg-[#1F4D3A]/8" />
          </div>

          <button
            onClick={handleDemo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              border-2 border-dashed border-[#D4A94F]/50 bg-[#D4A94F]/5
              text-sm font-semibold text-[#14161C]/70 hover:bg-[#D4A94F]/10
              hover:border-[#D4A94F]/70 transition-all"
          >
            Try demo — no sign-in needed
          </button>

          <p className="text-xs text-[#14161C]/35 text-center pt-2">
            Demo is read-only · Resets daily · No data saved
          </p>
        </div>

        <p className="text-center text-xs text-[#14161C]/30 mt-6">
          © {new Date().getFullYear()} Ndoa
        </p>
      </div>
    </div>
  )
}
