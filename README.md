# Ndoa — Wedding Platform

Offline-first, fault-tolerant wedding coordination platform built for real-world use in low-connectivity environments. Supports M-Pesa payment reconciliation, multi-cultural Kenyan wedding types, and role-based multi-member planning.

---

## Quick Start

```bash
pnpm install
cp .env.example .env.local   # fill in all values
pnpm db:push                 # apply schema to dev DB
pnpm db:seed                 # optional sample data
pnpm dev                     # start dev server (Turbopack)
```

Open http://localhost:3000 and sign in with Google.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + Radix UI |
| Server state | TanStack Query v5 |
| UI state | Zustand |
| Offline storage | Dexie (IndexedDB) — `WeddingPlatformDB` |
| Database | PostgreSQL via Prisma + Neon serverless |
| Prisma output | `lib/generated/prisma` (not default) |
| File storage | Supabase Storage (private buckets) |
| Auth | NextAuth v4 — Google OAuth + PrismaAdapter, JWT sessions |
| Payments | M-Pesa Daraja API (STK Push) |
| Package manager | pnpm |

---

## Architecture

### Offline-First Sync

Every mutation follows this flow:

1. Write to Dexie locally (optimistic, `isDirty: true`)
2. `enqueue(entityType, entityId, opType, payload)` adds to `syncQueue`
3. `startSyncWorker(weddingId)` flushes batches of 10 to `POST /api/sync/batch` every 15s
4. Conflicts resolved via `lib/sync/conflict-resolver.ts`

Priority levels: payments/RSVP/check-in = 1 (highest), guests/vendors = 2, rest = 3.

Circuit breaker opens after 5 consecutive failures. Check `getSyncCircuitOpen()` before showing sync UI.

Entities tracked offline: `guests`, `vendors`, `checklistItems`, `budgetLines`, `syncQueue`, `syncConflicts`, `weddingCache`.

### Conflict Resolution Strategy

| Entity | Strategy |
|---|---|
| Guest RSVP | Server wins |
| Guest check-in | OR-set (true if either side true) |
| Vendor status | Forward-only progression |
| Payment/Contribution | Server-authoritative |
| Checklist completed | OR-set |
| Budget amounts | Field-level merge, human review on conflict |

### Payments

M-Pesa STK Push via `lib/mpesa.ts`. Tokens cached for 1 hour. Callbacks hit `/api/mpesa/callback` (must remain unauthenticated and publicly accessible). Raw callbacks stored before processing. Idempotency enforced via unique `mpesaRef` + `idempotencyKey`.

### Storage

Supabase Storage with four private buckets: `documents`, `contracts`, `receipts`, `media`. All paths scoped to `weddingId/` prefix. Signed URLs expire after 1 hour.

---

## Project Structure

```
app/
  api/
    auth/[...nextauth]/         NextAuth handler
    sync/batch/                 Sync engine — idempotency, conflict detection
    weddings/[id]/              Wedding CRUD + all sub-resources
    mpesa/                      STK push initiation + callback
    storage/                    Signed URL generation + upload
    cron/evaluate-risks/        Scheduled risk evaluation
    templates/                  System template listing
    health/                     Uptime check
  dashboard/[weddingId]/
    page.tsx + dashboard-client.tsx
    guests/        vendors/     budget/       checklist/
    payments/      contributions/ risks/      settings/
    timeline/      events/      appointments/ analytics/
    moodboard/     documents/   dowry/        gifts/
    logistics/     day-of/
  login/                        Google OAuth entry
  onboarding/                   Wedding creation wizard

lib/
  db.ts                         Prisma singleton (PgBouncer-aware)
  db/dexie.ts                   IndexedDB schema (v3 migrations)
  db/checksum.ts                Deterministic entity checksums
  sync/engine.ts                Queue writer, batch flusher, circuit breaker
  sync/conflict-resolver.ts     Per-entity conflict resolution
  storage/supabase-storage.ts   Private buckets, signed URLs
  risk-engine.ts                Modular rule-based risk evaluation
  auth.ts                       NextAuth config
  mpesa.ts                      Daraja API client

hooks/
  use-guests.ts                 Offline-first guest CRUD
  use-vendors.ts                Offline-first vendor CRUD
  use-data.ts                   Checklist, budget, timeline
  use-payments.ts               Payments + contributions
  use-risks.ts                  Risk alerts
  use-atomic-write.ts           Dexie + TanStack Query atomic bridge

store/
  wedding-store.ts              Zustand: UI state, filters, offline status

components/
  sync-provider.tsx             Sync worker, offline banner, conflict toasts
  sidebar.tsx                   Navigation
  ui/index.tsx                  Design system (Radix + Tailwind)
```

---

## Domain Concepts

- Currency: **KES** (Kenyan Shillings) by default
- Cultural types: `STANDARD | KIKUYU | LUO | KAMBA | KALENJIN | COASTAL`
- Event types: `RURACIO | WEDDING | RECEPTION | POST_WEDDING | TRADITIONAL | CIVIL | ENGAGEMENT | AFTER_PARTY | HONEYMOON | MOVING`
- User roles: `COUPLE | PLANNER | COMMITTEE | VENDOR | ADMIN`
- Guest priority: `VIP | GENERAL | OVERFLOW`
- RSVP status: `PENDING | CONFIRMED | DECLINED | MAYBE | WAITLISTED`
- Vendor status: `ENQUIRED | QUOTED | BOOKED | CONFIRMED | CANCELLED | COMPLETED`

---

## Database

Prisma schema at `prisma/schema.prisma`. All models include `version`, `checksum`, `updatedBy`, `deletedAt` for optimistic locking and soft-delete.

Key models: `Wedding`, `WeddingMember`, `WeddingEvent`, `EventProgramItem`, `EventDependency`, `GuestEventAttendance`, `Guest`, `Household`, `Vendor`, `VendorEventAssignment`, `VendorNote`, `Payment`, `CommitteeContribution`, `ChecklistItem`, `ActivityGroup`, `BudgetLine`, `PaymentSchedule`, `RiskAlert`, `MediaItem`, `Appointment`, `Reminder`, `Incident`, `Template`, `DowryItem`, `AttireItem`, `GiftRegistryItem`, `GiftReceived`, `TransportRoute`, `Accommodation`, `HoneymoonDay`, `ProcessedOperation`, `AuditLog`.

```bash
pnpm db:generate   # after schema changes
pnpm db:migrate    # production migrations
pnpm db:push       # dev schema push
pnpm db:seed       # seed sample data
```

---

## Environment Variables

See `.env.example` for all required values.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection (Prisma CLI only) |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | App base URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side only) |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | Daraja API credentials |
| `MPESA_PASSKEY` / `MPESA_SHORTCODE` | M-Pesa STK Push config |
| `MPESA_CALLBACK_URL` | Public URL for M-Pesa callbacks |
| `CRON_SECRET` | Secures cron endpoints |
| `NEXT_PUBLIC_APP_URL` | App base URL (client-side) |

---

## API Conventions

- All routes validate session via `getServerSession(authOptions)`
- Errors return `{ error: string }` with appropriate HTTP status
- Payments require `idempotencyKey` on every mutation
- `/api/mpesa/callback` must remain unauthenticated
- Soft-deleted records always filtered by `deletedAt: null`

---

## Coding Conventions

- Prisma: `import { db } from '@/lib/db'` — never import from `@prisma/client` directly
- Dexie: `import { weddingDB } from '@/lib/db/dexie'`
- Types: `@/types` (root `types/` folder or `types/index.ts`)
- Client components: named `*-client.tsx` alongside their page
- Hooks: `hooks/use-[feature].ts` — wrap Dexie + sync enqueue logic
- No `use client` on API routes or server components

---

## Current State

### Implemented and Working

- Auth (Google OAuth, JWT sessions, role-based `WeddingMember`)
- Wedding CRUD + onboarding flow
- Guests — list, add, edit, RSVP, check-in (offline-first)
- Vendors — list, add, edit, status tracking (offline-first)
- Budget — line items by category, estimated/actual/committed columns
- Checklist — tasks with due dates, priority, assignment, check/uncheck
- Payments — M-Pesa STK Push, callback handling, contribution tracking
- Risk alerts — rule-based engine, cron + per-wedding manual trigger
- Settings — wedding metadata, theme color picker
- Offline sync engine — queue, batch flush, circuit breaker, conflict resolution
- Supabase Storage — private buckets, signed URLs, upload API
- Timeline page (minimal)

### Pages Scaffolded (UI Incomplete or Placeholder)

`analytics/`, `appointments/`, `events/`, `moodboard/`, `documents/`, `dowry/`, `gifts/`, `logistics/`, `day-of/`

### Schema Exists, UI Not Built

- `ActivityGroup` — task grouping with drag-and-drop
- `GuestEventAttendance` — per-event RSVP
- `EventDependency` — cross-event dependency graph
- `PaymentSchedule` — vendor payment milestones
- `Appointment` / `Reminder` — vendor meetings and notifications
- `Incident` — day-of incident log
- `Template` / `TemplateApplication` — reusable checklists/budgets
- `DowryItem` — traditional dowry tracking
- `AttireItem` — attire coordination
- `GiftRegistryItem` / `GiftReceived` — gift registry and thank-you tracker
- `TransportRoute` / `GuestTransport` — logistics
- `Accommodation` / `GuestAccommodation` — hotel bookings
- `HoneymoonDay` — honeymoon itinerary
- `Household` — guest household grouping

### Known Issues

- `components/sidebar.tsx` has a corrupted duplicate navigation block
- `app/dashboard/[weddingId]/timeline/page.tsx` has unused imports, untyped props, missing sort comparator
- Circuit breaker does not auto-reset after recovery (manual retry required)
- Reminders cron job not implemented despite schema support
- Multi-currency: `Wedding.currency` field exists but all UI renders KES only
- No real-time collaboration — sync is eventual-consistent only
- M-Pesa callbacks require a publicly accessible URL (not localhost)

### Pending Features (see CHANGES.md for full detail)

- Dashboard analytics widgets (charts, guest funnel, vendor readiness, cost-per-guest)
- Planning phases (`BUDGETING | PLANNING | PRE_WEDDING | PROCUREMENT | DAY_OF | POST_WEDDING`)
- Activity group UI with drag-and-drop reorder
- Per-event budget and checklist scoping
- Budget enhancements: variance column, smart allocation, receipt uploads, hidden cost suggestions
- Guest enhancements: household grouping, CSV import, seating layout, per-event attendance
- Vendor enhancements: notes log, contract upload, comparison tool, payment milestones
- Template system with seeded defaults
- Cultural/traditional module (dowry tracker, attire coordination)
- Day-of execution page (live timeline, incident log, role assignment)
- Role enforcement middleware and financial visibility gating
- Google Calendar sync, WhatsApp templates
- Multi-step onboarding wizard
