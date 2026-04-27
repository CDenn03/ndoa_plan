# Ndoa Plan — The Operating System for Weddings in Africa

*"Reliable like a bank 💳 Emotional like a love story ❤️ Structured like enterprise software ⚙️"*

Offline-first, fault-tolerant wedding coordination platform built for real-world use in low-connectivity environments. Supports M-Pesa payment reconciliation, multi-cultural Kenyan wedding types, and role-based multi-member planning.

## 🧩 Brand Essence

| Attribute | Meaning |
|---|---|
| **Trust** | Financial + planning reliability |
| **Connection** | Couples, families, committees |
| **Continuity** | Offline-first sync |
| **Celebration** | Weddings, culture, joy |

## 🎨 Brand Guidelines

### Color System
```css
/* Primary Colors */
--primary: #1F4D3A      /* Deep Green */
--gold: #D4A94F         /* Gold */

/* Supporting Colors */
--light-gold: #E6C878   /* Light Gold */
--dark-green: #16382B   /* Dark Green */
--background: #F7F5F2   /* Background */
--dark-bg: #0F172A      /* Dark Mode BG */

/* Functional Colors */
--success: #22C55E      /* Success */
--warning: #F59E0B      /* Warning */
--error: #EF4444        /* Error */
--info: #3B82F6         /* Info */
```

### Typography System
- **Primary Font (Brand/Headings)**: Playfair Display (elegant serif)
- **Secondary Font (UI/App)**: Inter (clean, modern)

**Usage:**
- Logo/Hero text: Playfair Display
- Headings (H1–H3): Playfair Display  
- UI text/forms: Inter
- Buttons: Inter (medium/semibold)

**Type Scale:**
- H1: 48–56px (Playfair)
- H2: 36–40px (Playfair)
- H3: 28–32px (Playfair)
- Body: 14–16px (Inter)
- Small: 12–13px (Inter)

### Design Principles
- **8px spacing system** for consistent layout
- **Generous whitespace** → reinforces premium feel
- **Outline icons** with minimal fill and slight rounded edges
- **Consistent stroke width** across all iconography

### Motion Design
- **Sync** → looping motion (match logo)
- **Payment success** → subtle gold pulse
- **Loading** → rotating loop (logo-inspired)

---

## Quick Start

```bash
pnpm install
cp .env.example .env        # fill in all values
pnpm db:push                # apply schema to dev DB
pnpm db:seed                # optional sample data
pnpm dev                    # start dev server (Turbopack)
```

Open http://localhost:3000 and sign in with Google.

To test on a mobile device on the same network, use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# then set NEXTAUTH_URL to the ngrok https URL in .env and restart
```

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
| Budget amounts | Server-authoritative (computed from payments) |

### Budget & Payments

`BudgetLine.actual` is server-computed — it is the SUM of all `COMPLETED` payments linked to that line via `Payment.budgetLineId`. It is never user-editable. The `lib/budget-helpers.ts` helper `recalculateBudgetLineActual()` is called automatically on every payment create, status update, and delete.

Each budget line row has a Pay quick-action button that opens a pre-filled payment modal. Full and partial payments are both supported. The edit modal shows a read-only actual/remaining summary and a list of all linked payments with individual delete.

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
      budget/[lineId]/          Budget line CRUD + linked payments GET
      payments/[paymentId]/     Payment PATCH (status) + DELETE
      events/[eventId]/
        contacts/               Event contact CRUD
        program/                Day-of program items
        attendances/            Guest check-in per event
    mpesa/                      STK push initiation + callback
    storage/                    Signed URL generation + upload
    cron/evaluate-risks/        Scheduled risk evaluation
    templates/                  System template listing
    health/                     Uptime check
  dashboard/[weddingId]/
    page.tsx + dashboard-client.tsx
    guests/        vendors/     budget/       checklist/
    payments/      contributions/ risks/      settings/
    events/        appointments/ moodboard/   documents/
    dowry/         gifts/        logistics/   day-of/
    schedule/
  login/                        Google OAuth entry

lib/
  db.ts                         Prisma singleton (Neon adapter)
  db/dexie.ts                   IndexedDB schema (versioned migrations)
  db/checksum.ts                Deterministic entity checksums
  sync/engine.ts                Queue writer, batch flusher, circuit breaker
  sync/conflict-resolver.ts     Per-entity conflict resolution
  storage/supabase-storage.ts   Private buckets, signed URLs
  risk-engine.ts                Modular rule-based risk evaluation
  budget-helpers.ts             recalculateBudgetLineActual()
  auth.ts                       NextAuth config (prompt: select_account)
  mpesa.ts                      Daraja API client

hooks/
  use-guests.ts                 Offline-first guest CRUD
  use-vendors.ts                Offline-first vendor CRUD + status update
  use-data.ts                   Checklist, budget (staleTime: 0 for accuracy)
  use-payments.ts               Payments + contributions + summary
  use-risks.ts                  Risk alerts
  use-atomic-write.ts           Dexie + TanStack Query atomic bridge

scripts/
  migrate-budget-actuals.ts     One-time migration: manual actuals → payments

components/
  sync-provider.tsx             Sync worker, offline banner, conflict toasts
  sidebar.tsx                   Navigation
  ui/index.tsx                  Design system (Radix + Tailwind)
  features/
    budget-components.tsx       Budget line modal, category breakdown, QuickPayModal
    payment-modals.tsx          STK push, manual payment, event payments tab
    schedule-components.tsx     Program, contacts (CRUD), incidents sub-tabs
    guest-components.tsx        Guest list, check-in, RSVP
    vendor-components.tsx       Vendor list, status, event assignments
    contribution-modals.tsx     Committee pledge + payment tracking
    logistics-modals.tsx        Transport routes + accommodation
    appointment-modals.tsx      Vendor appointments
    gift-modals.tsx             Gift registry + received gifts
    moodboard-components.tsx    Vision board with image categories
    photography-components.tsx  Photography planning tab
    task-modals.tsx             Checklist tasks with templates
```

---

## Domain Concepts

- Currency: **KES** (Kenyan Shillings) by default
- Cultural types: `STANDARD | KIKUYU | LUO | KAMBA | KALENJIN | COASTAL`
- Event types: `TRADITIONAL | WEDDING | RECEPTION | POST_WEDDING | CIVIL | ENGAGEMENT | AFTER_PARTY | HONEYMOON | MOVING`
- User roles: `COUPLE | PLANNER | COMMITTEE | VENDOR | ADMIN`
- Guest priority: `VIP | GENERAL | OVERFLOW`
- RSVP status: `PENDING | CONFIRMED | DECLINED | MAYBE | WAITLISTED`
- Vendor status: `ENQUIRED | QUOTED | BOOKED | CONFIRMED | CANCELLED | COMPLETED`

---

## Features

### Events

Each wedding can have multiple events (traditional ceremony, wedding, reception, etc.). Every event has its own set of tabs:

| Tab | Description |
|---|---|
| Tasks | Checklist items scoped to the event, with template loading |
| Schedule | Day-of program (daily/weekly view), contacts, incidents |
| Budget | Line items with estimated/actual/variance, Pay quick-action |
| Guests | RSVP and check-in per event |
| Appointments | Vendor meetings linked to the event |
| Payments | M-Pesa + manual payments, outstanding budget items surfaced |
| Contributions | Committee pledges and payment tracking |
| Logistics | Transport routes and accommodation |
| Vendors | Vendor assignments for the event |
| Gifts | Registry and received gifts |
| Vision | Moodboard with image categories |
| Photography | Photography planning and shot lists |

### Schedule — Contacts Sub-tab
consistent
The Contacts tab within the Schedule view shows two types of contacts:

- **Custom contacts** — added via "Add contact" button. Full CRUD (add, edit, delete). Fields: name, role, phone, email, notes.
- **Vendor contacts** — auto-populated from confirmed/booked vendors. Read-only.

### Budget & Finance

- Budget lines grouped by category with estimated, actual (computed), and variance columns
- `actual` is always server-computed from linked COMPLETED payments — never manually entered
- Pay quick-action on each line row opens a pre-filled payment modal
- Full and partial payment support with remaining balance auto-fill
- Edit modal shows read-only actual/remaining summary and linked payments list with delete
- Budget utilisation progress bar per category and overall
- Suggested allocation percentages based on wedding budget total
- Budget templates loadable per event

### Payments

- Manual payment recording with budget line linking
- M-Pesa STK Push with callback handling
- Payment date field for accurate record-keeping
- Deleting a payment automatically recalculates the linked budget line's actual
- Outstanding budget items surfaced in the Payments tab as pending items
- Payment history per event with filter by status

### Guests

- Add, edit, RSVP, check-in (offline-first via Dexie)
- Per-event attendance tracking
- Guest priority (VIP / General / Overflow)
- Side tracking (Bride / Groom / Both)

### Vendors

- Full CRUD with category and status tracking
- Vendor snapshot on dashboard with confirm quick-action
- Event assignment per vendor
- Vendor notes log
- Contact details (phone, email, contact name)

### Checklist / Tasks

- Tasks with due dates, priority, assignment, and check/uncheck
- Event-scoped tasks
- Template loading (BUDGET and CHECKLIST template types)
- Final check flag for day-of critical items

### Contributions

- Committee member pledges with due dates
- Partial and full payment tracking
- Status: PLEDGED / PARTIAL / FULFILLED / OVERDUE / CANCELLED

### Logistics

- Transport routes with capacity and driver details
- Accommodation bookings with room counts
- Guest assignment to routes and accommodation

### Moodboard / Vision

- Image categories (e.g. Flowers, Venue, Attire)
- Upload images per category via Supabase Storage
- Vision board display per event

### Photography

- Photography planning tab per event
- Shot list and photographer notes

### Dowry

- Traditional dowry item tracking (traditional ceremony-specific)
- Item status and negotiation notes

### Gifts

- Gift registry with item wishlist
- Received gifts log with thank-you tracking

### Appointments

- Vendor meeting scheduling with location and notes
- Linked to events and vendors

### Day-of

- Live day-of execution view
- Program timeline display
- Incident logging with severity levels (CRITICAL / HIGH / MEDIUM / LOW)
- Incident resolution tracking

### Risk Alerts

- Rule-based risk engine (`lib/risk-engine.ts`)
- Cron-triggered evaluation (`/api/cron/evaluate-risks`)
- Per-wedding manual trigger
- Severity levels: CRITICAL / HIGH / MEDIUM / LOW
- Resolved/unresolved tracking

### Dashboard

- Overview with guest count, budget utilisation, upcoming events, tasks
- Vendor snapshot with confirm quick-action
- Recent risk alerts
- Countdown to wedding date
- Next appointment display
- Moodboard preview

---

## Database

Prisma schema at `prisma/schema.prisma`. All models include `version`, `checksum`, `updatedBy`, `deletedAt` for optimistic locking and soft-delete.

Key models: `Wedding`, `WeddingMember`, `WeddingEvent`, `EventContact`, `EventProgramItem`, `EventDependency`, `GuestEventAttendance`, `Guest`, `Household`, `Vendor`, `VendorEventAssignment`, `VendorNote`, `Payment`, `CommitteeContribution`, `ChecklistItem`, `BudgetLine`, `PaymentSchedule`, `RiskAlert`, `MediaItem`, `Appointment`, `Reminder`, `Incident`, `Template`, `DowryItem`, `AttireItem`, `GiftRegistryItem`, `GiftReceived`, `TransportRoute`, `Accommodation`, `HoneymoonDay`, `ProcessedOperation`, `AuditLog`.

```bash
pnpm db:generate   # after schema changes
pnpm db:migrate    # production migrations
pnpm db:push       # dev schema push
pnpm db:seed       # seed sample data
pnpm tsx scripts/migrate-budget-actuals.ts  # one-time: migrate manual actuals to payments
```

---

## Environment Variables

See `.env.example` for all required values.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection (Prisma CLI only — no `-pooler` in hostname) |
| `NEXTAUTH_SECRET` | JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App base URL (use ngrok URL for mobile testing) |
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
- `BudgetLine.actual` is never written directly by API clients — only via `recalculateBudgetLineActual()`

---

## Coding Conventions

- Prisma: `import { db } from '@/lib/db'` — never import from `@prisma/client` directly
- Dexie: `import { weddingDB } from '@/lib/db/dexie'`
- Types: `@/types` (root `types/` folder or `types/index.ts`)
- Client components: named `*-client.tsx` alongside their page
- Hooks: `hooks/use-[feature].ts` — wrap Dexie + sync enqueue logic
- No `use client` on API routes or server components
- Budget data uses `staleTime: 0` — always re-fetches to ensure computed actuals are current

---

## Known Limitations

- M-Pesa callbacks require a publicly accessible URL — use ngrok for local testing
- Circuit breaker does not auto-reset after recovery (manual retry required)
- Reminders cron job not implemented despite schema support
- Multi-currency: `Wedding.currency` field exists but all UI renders KES only
- No real-time collaboration — sync is eventual-consistent only
- Google Calendar sync not yet implemented
