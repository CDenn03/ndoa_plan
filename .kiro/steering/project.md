---
inclusion: always
---

# Wedding Platform — Project Steering

## Stack Overview

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL via Neon serverless + Prisma ORM
- **Prisma client output**: `lib/generated/prisma` (NOT the default `node_modules/.prisma`)
- **Auth**: NextAuth v4 with Google OAuth + PrismaAdapter, JWT sessions — `prompt: select_account` always forced
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
- Shared server helpers: `lib/[feature]-helpers.ts` (e.g. `lib/budget-helpers.ts`)
- One-time migration scripts: `scripts/[name].ts` — run with `pnpm tsx scripts/[name].ts`

## Offline-First Sync Pattern

Every mutation follows this flow:

1. Write to Dexie locally (optimistic, mark `isDirty: true`)
2. Call `enqueue(entityType, entityId, opType, payload)` from `lib/sync/engine.ts`
3. `startSyncWorker(weddingId)` flushes batches to `POST /api/sync/batch` every 15s
4. Conflicts resolved via `lib/sync/conflict-resolver.ts`

Priority levels: payments/RSVP/check-in = 1 (highest), guests/vendors = 2, rest = 3

Circuit breaker opens after 5 consecutive failures — check `getSyncCircuitOpen()` before showing sync UI.

## Budget & Payment Architecture

`BudgetLine.actual` is **server-computed only** — it is the SUM of all `COMPLETED` payments where `Payment.budgetLineId = BudgetLine.id`. It must never be written directly by API clients or UI forms.

- `lib/budget-helpers.ts` exports `recalculateBudgetLineActual(budgetLineId)` — call this after every payment create, status update, or delete
- `Payment.budgetLineId` is a nullable FK to `BudgetLine` — always persist it when a payment is linked to a line
- `Payment.paymentDate` is a user-specified date field, distinct from `processedAt` (system timestamp)
- The budget line PATCH route (`app/api/weddings/[id]/budget/[lineId]/route.ts`) intentionally excludes `actual` from accepted fields
- `useBudgetLines` uses `staleTime: 0` — always re-fetches from server to ensure computed actuals are current
- All numeric values from Dexie must be sanitized with `Number(x) || 0` to prevent NaN from stale Decimal objects

## Prisma Conventions

- Always run `pnpm db:generate` after schema changes
- Migrations: `pnpm db:migrate` (deploy) or `pnpm db:push` (dev)
- Seed: `pnpm db:seed`
- All models include `version`, `checksum`, `updatedBy`, `deletedAt` for soft-delete + optimistic locking
- Indexes are intentional — do not remove them without discussion
- `DIRECT_URL` must be the non-pooled Neon connection string (no `-pooler` in hostname) — required for Prisma CLI

## API Route Conventions

- All routes validate session via `getServerSession(authOptions)`
- Return `{ error: string }` with appropriate HTTP status on failure
- Idempotency keys used for payments (`idempotencyKey` field on `Payment`)
- M-Pesa callbacks hit `/api/mpesa/callback` — must remain unauthenticated
- Budget line GET `[lineId]` returns linked payments for that line (not the line itself)

## Event Contacts

`EventContact` is a model linked to `WeddingEvent`. API routes at:
- `app/api/weddings/[id]/events/[eventId]/contacts/route.ts` — GET (list) + POST (create)
- `app/api/weddings/[id]/events/[eventId]/contacts/[contactId]/route.ts` — PATCH + DELETE

The Schedule tab's Contacts sub-tab shows both custom `EventContact` records (editable) and vendor contacts (read-only). The "Add contact" button replaces the "Log Incident" button when the contacts sub-tab is active.

## UI Conventions

- Components exported from `components/ui/index.tsx`
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Toast notifications via `components/ui/toast.tsx`
- Sidebar navigation in `components/sidebar.tsx`
- Theme colors stored per-wedding: `themeColor` + `themeAccent` (hex strings)
- Button `variant="danger"` for destructive actions (not `"destructive"`)
- Hydration-sensitive formatting (e.g. `Intl.NumberFormat`) must use a `mounted` state guard to avoid SSR/client mismatch

## Environment Variables

Required vars (see `.env.example`):
- `DATABASE_URL` — Neon PostgreSQL **pooled** connection string
- `DIRECT_URL` — Neon PostgreSQL **direct** connection string (no `-pooler`) — Prisma CLI only
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — app base URL; use ngrok HTTPS URL when testing on mobile
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`
- `CRON_SECRET` — for securing cron endpoints

## Mobile / Network Testing

To test on a mobile device:
1. Run `ngrok http 3000` to get a public HTTPS URL
2. Set `NEXTAUTH_URL` to the ngrok URL in `.env`
3. Add the ngrok URL to Google Console → Authorized JavaScript origins and redirect URIs
4. Add the ngrok hostname to `allowedDevOrigins` in `next.config.ts`
5. Restart the dev server

## Do Not

- Do not import from `@prisma/client` directly — always use `lib/generated/prisma`
- Do not use `localStorage` for wedding data — use Dexie
- Do not add `use client` to API routes or server components
- Do not skip `idempotencyKey` on payment mutations
- Do not remove soft-delete fields (`deletedAt`) from queries without filtering them
- Do not write to `BudgetLine.actual` directly from API routes or UI — use `recalculateBudgetLineActual()`
- Do not use raw IP addresses in Google OAuth — use ngrok or a proper domain
- Do not render `Intl.NumberFormat` locale-sensitive output during SSR without a `mounted` guard
