import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.100.235', 'dreamboat-disparity-grub.ngrok-free.dev'],
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default config
