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

## Template System Architecture

Templates allow users to quickly populate checklists, budgets, appointments, and photography deliverables with pre-defined items. Templates are stored in the `Template` model with a `type` field and a JSON `data` field.

### Supported Template Types

| Type | Enum | Data shape | Creates |
|------|------|-----------|---------|
| Checklist | `CHECKLIST` | `{ title, category, priority, isFinalCheck?, description? }[]` | `ChecklistItem` rows |
| Budget | `BUDGET` | `{ category, description, estimated }[]` | `BudgetLine` rows |
| Appointment | `APPOINTMENT` | `{ title, location?, notes?, offsetDays? }[]` | `Appointment` rows |
| Photography deliverables | `PHOTOGRAPHY` | `{ title }[]` | `ChecklistItem` rows with `category='PHOTOGRAPHY'`, `description='deliverable'` |

### Template Application Flow

1. **API Endpoint**: `POST /api/weddings/[id]/apply-template`
   - Accepts `{ templateId: string, eventId?: string }`
   - Creates new records via `createMany` (server-side only)
   - Records a `TemplateApplication` entry for tracking
   - Returns `{ ok: true, type: template.type }`

2. **Modal Pattern** — every feature that supports templates uses the same modal shape:
   ```tsx
   function LoadXTemplateModal({ weddingId, eventId, onClose }) {
     const [applying, setApplying] = useState<string | null>(null)
     const { data: templates = [], isLoading } = useQuery({
       queryKey: ['templates', 'TYPE'],
       queryFn: async () => {
         const res = await fetch('/api/templates?type=TYPE')
         if (!res.ok) return []
         return res.json()
       },
     })

     const handleApply = async (templateId: string) => {
       setApplying(templateId)
       try {
         const res = await fetch(`/api/weddings/${weddingId}/apply-template`, {
           method: 'POST', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ templateId, eventId: eventId ?? undefined }),
         })
         if (!res.ok) throw new Error()
         // Invalidate the relevant query — no Dexie sync needed for server-only features
         await qc.invalidateQueries({ queryKey: ['feature-query-key', weddingId] })
         // For Dexie-backed features (checklist), also clear + re-populate Dexie:
         // const fresh = await fetch(`/api/weddings/${weddingId}/checklist`)
         // await weddingDB.checklistItems.where('weddingId').equals(weddingId).delete()
         // await weddingDB.checklistItems.bulkPut(await fresh.json())
         toast('Template applied', 'success')
         onClose()
       } catch { toast('Failed to apply template', 'error') }
       finally { setApplying(null) }
     }

     return (
       <Modal onClose={onClose} title="Load template">
         <div className="space-y-3">
           <p className="text-xs text-[#14161C]/40">Appends items to your list. Existing items are not affected.</p>
           {isLoading ? <Spinner /> : templates.length === 0
             ? <p className="text-sm text-[#14161C]/40 py-4 text-center">No templates available.</p>
             : (
               <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                 {templates.map(t => (
                   <div key={t.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#1F4D3A]/8 last:border-0">
                     <div>
                       <p className="text-sm font-semibold text-[#14161C]">{t.name}</p>
                       <p className="text-xs text-[#14161C]/40">{t.data.length} items</p>
                     </div>
                     <Button size="sm" variant="lavender" onClick={() => void handleApply(t.id)} disabled={applying === t.id}>
                       {applying === t.id ? <Spinner size="sm" /> : 'Apply'}
                     </Button>
                   </div>
                 ))}
               </div>
             )}
         </div>
       </Modal>
     )
   }
   ```

3. **Dexie sync rule**: Only needed for features backed by Dexie (currently only `ChecklistItem`). For server-only features (photography deliverables, budget, appointments), `qc.invalidateQueries` is sufficient.

### The Caching Pitfall (Dexie-backed features only)

**Problem**: When applying a second template to a Dexie-backed feature, new items weren't appearing because:
1. First template application populated Dexie
2. Query hook's early return (`if (local.length > 0)`) prevented server fetch
3. `bulkPut` merged new items but query returned stale cached data

**Solution**: Clear Dexie completely before inserting fresh data:
```typescript
const fresh = await fetch(`/api/weddings/${weddingId}/checklist`)
if (fresh.ok) {
  const serverItems = await fresh.json()
  await weddingDB.checklistItems.where('weddingId').equals(weddingId).delete()
  await weddingDB.checklistItems.bulkPut(serverItems)
  qc.setQueryData(['checklist', weddingId], serverItems.sort((a, b) => a.order - b.order))
}
```

### Template Implementation Checklist

When adding templates to a new feature:

- [ ] Add the type to `TemplateType` enum in `prisma/schema.prisma` if needed
- [ ] Add a handler branch in `app/api/weddings/[id]/apply-template/route.ts`
- [ ] Seed templates in `prisma/seed.ts` using `db.template.upsert` with a stable `id`
- [ ] Run `pnpm db:generate && pnpm db:push && pnpm db:seed`
- [ ] Create a `Load[Feature]TemplateModal` component following the modal pattern above
- [ ] Add a "Template" button (use `variant="lavender"`) in the feature's header
- [ ] After apply: invalidate the feature's React Query key; also sync Dexie if applicable
- [ ] Show success toast and close modal on success

### Existing Template Implementations

| Feature | Type | Modal component | Query key invalidated |
|---------|------|----------------|----------------------|
| Checklist / Tasks | `CHECKLIST` | `LoadTemplateModal` in `task-modals.tsx` | `['checklist', weddingId]` + Dexie |
| Budget | `BUDGET` | `LoadBudgetTemplateModal` in `budget-components.tsx` | `['budget', weddingId]` |
| Appointments | `APPOINTMENT` | `LoadAppointmentTemplateModal` in `appointment-modals.tsx` | `['appointments', weddingId]` |
| Photography deliverables | `PHOTOGRAPHY` | `LoadDeliverableTemplateModal` in `photography-components.tsx` | `['photography', weddingId]` |

### Template Data Structure

Templates are seeded in `prisma/seed.ts` using `upsert` with a stable deterministic `id`:

```typescript
await db.template.upsert({
  where: { id: 'sys-checklist-standard-wedding-checklist' },
  update: {},
  create: {
    id: 'sys-checklist-standard-wedding-checklist',
    type: 'CHECKLIST',
    name: 'Standard Wedding Checklist',
    culturalType: 'STANDARD',
    isSystem: true,
    data: [
      { title: 'Book venue', category: 'VENUE', priority: 1, isFinalCheck: false },
      { title: 'Hire caterer', category: 'CATERING', priority: 1 },
    ],
  },
})
```

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
- Do not use `bulkPut` alone when applying templates — always clear Dexie first to prevent stale data issues
