---
inclusion: always
---

# Wedding Platform — Project Steering

## Stack Overview

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL via Neon serverless + Prisma ORM
- **Prisma client output**: `lib/generated/prisma` (NOT the default `node_modules/.prisma`)
- **Auth**: NextAuth v4 with Google OAuth + PrismaAdapter, JWT sessions
- **Offline DB**: Dexie (IndexedDB) — `WeddingPlatformDB` with versioned migrations
- **Sync**: Custom offline-first sync engine at `lib/sync/engine.ts`
- **Payments**: M-Pesa STK Push via `lib/mpesa.ts`
- **Storage**: Supabase Storage via `lib/storage/supabase-storage.ts`
- **UI**: Radix UI primitives + Tailwind CSS + `class-variance-authority`
- **State**: Zustand + TanStack Query v5
- **Package manager**: pnpm

## Project Context

This is a Kenyan wedding planning platform. Key domain concepts:

- Currency is **KES** (Kenyan Shillings) by default
- Cultural wedding types: `STANDARD | KIKUYU | LUO | KAMBA | KALENJIN | COASTAL`
- Wedding events include: `RURACIO` (dowry negotiation), `WEDDING`, `RECEPTION`, `POST_WEDDING`, `TRADITIONAL`, `CIVIL`
- User roles: `COUPLE | PLANNER | COMMITTEE | VENDOR | ADMIN`
- Committee members make pledges (`CommitteeContribution`) and pay via M-Pesa

## File & Folder Conventions

- API routes: `app/api/[resource]/[id]/[sub-resource]/route.ts`
- Dashboard pages: `app/dashboard/[weddingId]/[feature]/page.tsx`
- Client components: named `*-client.tsx` alongside their page
- Hooks: `hooks/use-[feature].ts` — wrap Dexie + sync enqueue logic
- All Prisma imports: `import { db } from '@/lib/db'`
- All Dexie imports: `import { weddingDB } from '@/lib/db/dexie'`
- Types live in `@/types` (root `types/` folder or `types/index.ts`)

## Offline-First Sync Pattern

Every mutation follows this flow:

1. Write to Dexie locally (optimistic, mark `isDirty: true`)
2. Call `enqueue(entityType, entityId, opType, payload)` from `lib/sync/engine.ts`
3. `startSyncWorker(weddingId)` flushes batches to `POST /api/sync/batch` every 15s
4. Conflicts resolved via `lib/sync/conflict-resolver.ts`

Priority levels: payments/RSVP/check-in = 1 (highest), guests/vendors = 2, rest = 3

Circuit breaker opens after 5 consecutive failures — check `getSyncCircuitOpen()` before showing sync UI.

## Prisma Conventions

- Always run `pnpm db:generate` after schema changes
- Migrations: `pnpm db:migrate` (deploy) or `pnpm db:push` (dev)
- Seed: `pnpm db:seed`
- All models include `version`, `checksum`, `updatedBy`, `deletedAt` for soft-delete + optimistic locking
- Indexes are intentional — do not remove them without discussion

## API Route Conventions

- All routes validate session via `getServerSession(authOptions)`
- Return `{ error: string }` with appropriate HTTP status on failure
- Idempotency keys used for payments (`idempotencyKey` field on `Payment`)
- M-Pesa callbacks hit `/api/mpesa/callback` — must remain unauthenticated

## UI Conventions

- Components exported from `components/ui/index.tsx`
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Toast notifications via `components/ui/toast.tsx`
- Sidebar navigation in `components/sidebar.tsx`
- Theme colors stored per-wedding: `themeColor` + `themeAccent` (hex strings)

## Environment Variables

Required vars (see `.env.example`):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`
- `CRON_SECRET` — for securing cron endpoints

## Do Not

- Do not import from `@prisma/client` directly — always use `lib/generated/prisma`
- Do not use `localStorage` for wedding data — use Dexie
- Do not add `use client` to API routes or server components
- Do not skip `idempotencyKey` on payment mutations
- Do not remove soft-delete fields (`deletedAt`) from queries without filtering them
