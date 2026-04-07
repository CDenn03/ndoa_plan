# Ndoa — Wedding Platform

Fault-tolerant, offline-first wedding coordination platform. Built for real-world use in low-connectivity environments with M-Pesa payment reconciliation and multi-cultural wedding support.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in all values (see Environment Variables section below)

# 3. Run database migration
npx prisma db push

# 4. Run SQL hardening migration
psql $DIRECT_URL -f sql/migration.sql

# 5. Seed sample data (optional)
npm run db:seed

# 6. Start development server
npm run dev
```

Open http://localhost:3000 and sign in with Google.

---

## Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Server state | TanStack Query |
| UI state | Zustand |
| Offline storage | Dexie (IndexedDB) |
| Database | PostgreSQL via Prisma (Neon) |
| File storage | Supabase Storage (private buckets) |
| Auth | NextAuth.js (Google OAuth) |
| Payments | M-Pesa Daraja API |

### Key design decisions

**Offline-first, not offline-capable.** The app works fully without internet. Every write goes to IndexedDB first. A background sync worker flushes to the server when connectivity is available.

**Versioned conflict detection.** Every entity has a `version` field. Sync updates include `clientVersion`. The server returns 409 if versions diverge. The client resolves conflicts per-entity type (RSVP: server wins; check-in: OR-set; budget: field merge with human escalation).

**Atomic write bridge.** `atomicWrite()` writes Dexie first, then updates TanStack Query cache only on Dexie success. Prevents stale-positive UI state from silent Dexie failures (storage quota, private browsing).

**Server-authoritative payments.** Payment records are never created client-wins. M-Pesa callbacks are idempotent by `mpesaRef` unique constraint. Raw callbacks are always stored before processing.

---

## Project structure

```
app/
  api/
    auth/[...nextauth]/     NextAuth handler
    sync/batch/             Sync engine server-side (idempotency, conflict detection)
    weddings/               Wedding CRUD + per-resource endpoints
    mpesa/                  M-Pesa callback + STK push initiation
    storage/signed-url/     Private signed URL generation
  dashboard/[weddingId]/    Main app pages
  login/                    Auth page
  onboarding/               First wedding creation

lib/
  db.ts                     Prisma singleton (PgBouncer-aware)
  db/dexie.ts               IndexedDB schema + migration safety
  db/checksum.ts            Deterministic entity checksums
  sync/engine.ts            Queue writer, batch flusher, circuit breaker
  sync/conflict-resolver.ts Per-entity conflict resolution strategies
  storage/supabase-storage.ts Private buckets, signed URLs
  risk-engine.ts            Modular rule-based risk evaluation
  auth.ts                   NextAuth config

hooks/
  use-guests.ts             Offline-first guest CRUD hooks
  use-vendors.ts            Offline-first vendor hooks
  use-data.ts               Timeline, checklist, budget hooks
  use-atomic-write.ts       Dexie + TanStack Query atomic bridge

store/
  wedding-store.ts          Zustand: UI state, filters, offline status

components/
  sync-provider.tsx         Sync worker, offline banner, conflict toasts
  providers.tsx             TanStack Query + NextAuth providers
  sidebar.tsx               Navigation
  ui/index.tsx              Design system components

prisma/
  schema.prisma             Full database schema
  seed.ts                   Sample data seed

sql/
  migration.sql             Idempotent DDL: indexes, RLS, audit rules, private storage
```

---

## Environment variables

```bash
# Database (Neon)
DATABASE_URL     # Pooled connection with ?pgbouncer=true&connection_limit=1
DIRECT_URL       # Direct connection for migrations (no params)

# Auth
NEXTAUTH_SECRET  # openssl rand -base64 32
NEXTAUTH_URL     # https://your-domain.com in production
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # Server-side only — never expose to browser

# M-Pesa
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_PASSKEY
MPESA_SHORTCODE
MPESA_CALLBACK_URL           # Must be publicly accessible (not localhost)
```

---

## Production checklist

### Before first deployment
- [ ] Run `sql/migration.sql` on production database
- [ ] Set all environment variables in Vercel
- [ ] Verify Supabase Storage buckets are private (`SELECT public FROM storage.buckets`)
- [ ] Add MPESA_CALLBACK_URL pointing to production URL
- [ ] Test M-Pesa STK push in Safaricom sandbox
- [ ] Set up Uptime Robot to ping `/api/health` every 5min (keeps Vercel warm)

### Critical fixes (P0 — must ship before first wedding)
- [x] PgBouncer connection pooling (`pgbouncer=true` in DATABASE_URL)
- [x] M-Pesa idempotency + unique `mpesaRef` constraint
- [x] Supabase Storage private + signed URLs
- [x] Dexie migration safety harness
- [x] `ProcessedOperation` table for server-side idempotency
- [x] Entity version fields + 409 conflict detection
- [x] Composite indexes on all entity tables

### Deployment
```bash
# Vercel (recommended)
vercel deploy --prod

# Run migration on production DB after deploy
npx prisma migrate deploy
```

---

## Offline behaviour

| Feature | Offline | Sync on reconnect |
|---------|---------|-------------------|
| View all guests/vendors/timeline | ✅ | — |
| Check in guests | ✅ | ✅ Auto |
| Update RSVPs | ✅ | ✅ Auto |
| Add new guest/vendor | ✅ | ✅ Auto |
| Real-time vendor alerts | ❌ | ✅ Missed events fetched |
| M-Pesa payments | ❌ (requires internet) | — |
| Risk alerts | Local rules only | ✅ Full server eval |

When offline, an amber banner appears. A sync indicator in the sidebar shows live/offline status. Circuit breaker engages after 5 consecutive sync failures and shows a retry button.

---

## Day-of coordinator protocol

1. **Before the event:** Ensure all devices have synced (green indicator in sidebar)
2. **If internet drops:** Designate one device as the seating authority — only that device assigns tables during offline mode
3. **Guest check-in:** Works fully offline — tap check-in, syncs automatically when connectivity returns
4. **Vendor contact:** All vendor phone numbers are available offline in the Vendors page
5. **Timeline shifts:** Update locally; cascade to all devices on reconnect

---

## M-Pesa integration

The platform supports M-Pesa STK Push for:
- Committee contributions (pledge → payment tracking)
- Vendor deposits and final payments
- Ad-hoc payments

Callback handling is hardened against:
- Duplicate callbacks (unique `mpesaRef` constraint + idempotency check)
- Amount mismatches (reconciliation flag + audit log)
- Network retries (always return HTTP 200 to Safaricom)

---

## Extending the risk engine

Add rules to `lib/risk-engine.ts`:

```typescript
const myRule: RiskRule = (ctx) => {
  if (someCondition) return {
    ruleId: 'my.rule',
    triggered: true,
    severity: 'HIGH',
    category: 'vendor',
    message: 'Human-readable alert message',
    data: { ... },
    suggestedAction: 'What the coordinator should do',
  }
  return null
}
// Add to the rules array at the bottom of the file
```

Rules are evaluated by `POST /api/weddings/[id]/evaluate-risks`. Hook this to a Vercel cron job for automatic evaluation:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/evaluate-risks",
    "schedule": "0 */6 * * *"
  }]
}
```
