# Wedding Platform — Required Changes

This document maps the full product specification against the current codebase and lists every gap that needs to be built, extended, or fixed. Items are grouped by domain and ordered by priority.

---

## Current State Summary

The platform has a solid foundation:
- Next.js 16 + Prisma + Neon (PostgreSQL) + Dexie (IndexedDB offline)
- Auth via NextAuth with role-based `WeddingMember`
- Working pages: Dashboard, Guests, Vendors (basic), Budget, Checklist, Timeline, Payments, Risk Alerts, Settings
- M-Pesa STK Push integration
- Offline-first sync engine with conflict resolution
- Risk alert engine (cron + per-wedding evaluate endpoint)

Everything below is **missing or incomplete** relative to the spec.

---

## 1. Dashboard — Analytics & Highlights

**Status: Basic stat cards and risk list exist. Missing analytics, couple photo, vision board preview, and phase/deadline summaries.**

### Changes needed

**Couple photo**
- Add `Wedding.couplePhotoPath String?` field to the schema.
- Display the couple's photo prominently in the dashboard header (circular avatar pair or hero banner). Upload via the existing Supabase Storage signed-URL endpoint.
- Fall back to initials avatar when no photo is uploaded.

**Enhanced analytics widgets**
- Budget doughnut chart inline on the dashboard (category breakdown, not just a progress bar). Use Recharts — add to dependencies.
- Guest funnel: Invited → Confirmed → Checked-in as a horizontal step bar.
- Task completion ring per planning phase (see §6 for phases).
- Vendor readiness bar: confirmed / booked / enquired counts with colour coding.
- Cost-per-guest live calculation: `totalCommitted ÷ confirmedGuests`.

**Upcoming deadlines widget**
- Show checklist items due in the next 7 days and 30 days, grouped by phase.
- Flag overdue items in red with a count badge on the sidebar nav item.

**"What's at risk" panel**
- Surface top 3 CRITICAL/HIGH risks inline. Currently risks only appear on the Risks page.
- Each risk card links directly to the relevant page (vendor, budget, checklist).
- Smart prioritization: suppress LOW/MEDIUM unless the user expands a "Show all" toggle.

**Multi-event countdown**
- Replace the single days-to-go counter with a scrollable list of all upcoming `WeddingEvent` dates.
- Show event name, date, days remaining, and a coloured dot per event type.

**Vision board preview**
- Show the 4 most recently uploaded mood board images as a mini grid on the dashboard.
- "View full board →" link to `/dashboard/[weddingId]/moodboard`.

**Quick actions bar**
- Floating row of the 4 most contextually relevant actions based on planning phase and days remaining (e.g. "Confirm caterer", "Send RSVP reminders", "Upload contract").

---

## 2. Multi-Event Architecture

**Status: Schema has `WeddingEvent`, UI does not exist.**

### Changes needed
- Add to `EventType` enum: `ENGAGEMENT`, `AFTER_PARTY`, `HONEYMOON`, `MOVING`.
- Create `/dashboard/[weddingId]/events` page — list all sub-events with date, venue, status, and a per-event progress ring.
- Add `eventId` FK (nullable) to `BudgetLine`, `TimelineEvent`, and `ChecklistItem` so each can be scoped to a sub-event.
- Add `GuestEventAttendance { id, guestId, eventId, rsvpStatus }` join table for per-event guest attendance.
- Add `EventDependency { id, fromEventId, toEventId, type }` for cross-event dependencies (e.g. "Ruracio confirmed → unlock reception venue booking").
- Dashboard countdown must show all upcoming events.
- Add "Events" nav item to sidebar.

---

## 3. Planning Phases

**Status: Not implemented. Tasks and budget lines have no phase grouping.**

### Changes needed

**Schema**
- Add `PlanningPhase` enum: `BUDGETING | PLANNING | PRE_WEDDING | PROCUREMENT | DAY_OF | POST_WEDDING`.
- Add `phase PlanningPhase` field to `ChecklistItem`, `BudgetLine`, and `WeddingEvent`.

**UI**
- On the Checklist page, add a phase tab bar (Budgeting / Planning / Pre-Wedding / Procurement / Day-of / Post-Wedding). Default view shows all phases; clicking a tab filters to that phase.
- On the Budget page, add a phase filter so couples can see spend per phase.
- Dashboard shows a phase progress summary: a row of phase pills with `X/Y tasks done` per phase.
- Phase-aware templates (see §15): each template item is pre-tagged with a phase.

**Final checks per activity**
- Each phase has a "Final check" section — a pinned sub-list of must-complete items that must all be ticked before the phase is considered done.
- A phase is marked complete only when all its final-check items are ticked. Show a lock icon on incomplete phases.
- Add `ChecklistItem.isFinalCheck Boolean @default(false)` to the schema.

---

## 4. Activity Groups (Bride Prep, Venue Prep, Logistics, etc.)

**Status: Checklist has category strings but no structured activity grouping.**

### Changes needed

**Schema**
- Add `ActivityGroup { id, weddingId, name, phase PlanningPhase, color String, order Int }` model.
- Add `activityGroupId String?` FK to `ChecklistItem`.

**Seeded default groups**
Seed the following groups (users can rename/add/delete):
- Bride Preparation
- Groom Preparation
- Venue Preparation
- Catering & Food
- Decor & Flowers
- Photography & Video
- Music & Entertainment
- Transport & Logistics
- Guest Management
- Legal & Admin
- Attire & Beauty
- Honeymoon Prep

**UI**
- Checklist page: group tasks by `ActivityGroup` within each phase tab. Show group header with colour dot, task count, and completion percentage.
- Drag-and-drop reorder within a group (use `@dnd-kit/core` — add to dependencies).
- "Add group" button to create custom activity groups.
- Each group has a collapsible body so couples can focus on one activity at a time.

---

## 5. Budget & Finance

**Status: Category budget lines work. Several features missing.**

### Changes needed
- **Per-event budgets**: filter budget lines by `eventId` once the FK is added (§2).
- **Multi-currency**: `Wedding.currency` exists but UI always renders KES. Pass currency through all `Intl.NumberFormat` calls and add a currency selector to Settings.
- **Payment schedules**: add `PaymentSchedule { id, vendorId, weddingId, dueDate, amount, isPaid }` model and milestone UI per vendor.
- **Receipt uploads**: add an upload button on each `PaymentRow` that stores to Supabase Storage and links `MediaItem.linkedToId = payment.id`.
- **Hidden cost engine**: API route that suggests overlooked line items (generator, permits, staff meals, transport buffer). Surface as a dismissible card on the Budget page.
- **Variance column**: add estimated − actual variance with colour coding to the budget table.
- **Smart budget allocation**: "Suggest allocation" button that pre-fills categories using spec percentages (Catering 40–50%, Venue 15–25%, Decor 10–20%).
- **Phase filter**: filter budget lines by `PlanningPhase` (§3).
- **Catering buffer callout**: `confirmedGuests + uninvitedBuffer × cateringCostPerHead` shown as a callout on the Budget page.

---

## 6. Guest Management

**Status: Core list, RSVP, check-in, and side filtering work. Missing several features.**

### Changes needed

**Expected guest count (editable input)**
- Add `Wedding.expectedGuestCount Int?` field.
- Show an editable inline input on the Guests page header: "Expected guests: [___]". This is separate from the confirmed RSVP count and is used for catering estimates and logistics planning.
- Show a delta indicator: "X more than confirmed" or "X fewer than expected".

**Household grouping**
- Add `Household { id, weddingId, name }` model and `Guest.householdId` FK.
- Group guests by household in the list view with a collapsible household row.

**Relationship tagging**
- `Guest.tags` array exists but is unused. Render as editable chips (VIP, Family, Work, Committee, Out-of-town, Bridal Party).
- Allow adding custom tags.

**Plus-one support**
- Add `Guest.plusOneOf String?` (FK to parent guest) and `Guest.plusOneAllowed Boolean @default(false)`.
- Show plus-one indicator in the guest row and allow toggling.

**Priority tiers**
- Add `Guest.priority` enum `VIP | GENERAL | OVERFLOW`. Filter and sort by priority.

**Event-specific attendance**
- Once `GuestEventAttendance` is added (§2), show per-event RSVP on the guest detail drawer.

**Dietary notes**
- `Guest.mealPref` exists but is not shown in the Add/Edit modal. Expose it.

**Seating layout**
- Add a "Seating" tab on the Guests page: a grid of tables showing assigned guests per table. Currently only `tableNumber` is stored; add a visual table map.

**Bulk import**
- CSV import: parse name, phone, side, table, tags columns.

---

## 7. Vendor Management

**Status: Basic vendor card with status and contact links. Missing description, notes log, comparison, contracts.**

### Changes needed

**Description and notes log**
- Add `Vendor.description String?` — a free-text field for what the vendor does, their specialty, or key terms.
- Add `VendorNote { id, vendorId, weddingId, content String, createdBy String, createdAt DateTime }` model — an append-only log of communication updates, things to note, and follow-up reminders.
- In the vendor detail view, show a chronological notes feed with a text input to add new notes. Each note shows author and timestamp.
- This replaces the single `Vendor.notes String?` field (keep for migration, deprecate in UI).

**Vendor comparison tool**
- "Compare" mode: select 2–3 vendors in the same category → side-by-side table of price, status, rating, description, and notes summary.

**Contract management**
- `Vendor.contractPath` exists but has no upload UI. Add "Upload contract" button → Supabase Storage.

**Payment milestones**
- Link `PaymentSchedule` (§5) to vendors. Show upcoming payment due dates on the vendor card.

**Backup vendor list**
- Add `Vendor.isBackup Boolean @default(false)`. Surface backup vendors on the Risk Alerts page when a primary vendor is unresponsive.

**Vendor reliability**
- `Vendor.lastContactAt` exists. Add "Log contact" button. Show warning badge if no contact in >14 days.

**Portfolio / attachments**
- Attach `MediaItem` records to a vendor. Add an "Attachments" section to the vendor detail view.

**Vendor-specific timeline filter**
- On the Timeline page, add a vendor filter dropdown to show only events assigned to a specific vendor.

---

## 8. Task Management & Checklist

**Status: Checklist page exists. Missing person-in-charge, dependencies, activity groups, and phase grouping.**

### Changes needed

**Person in charge**
- Add `ChecklistItem.assignedToName String?` (free text, for non-user assignees like "Bride's aunt") alongside the existing `assignedTo String?` (userId).
- Show the assignee name/avatar on each task row.
- In the Add/Edit task modal, add an "Assigned to" field with a dropdown of `WeddingMember` names plus a free-text fallback.

**Task dependencies**
- Add `ChecklistItem.dependsOnId String?` (nullable self-FK).
- Show blocked tasks as greyed out with a "Waiting for: [task name]" label until the dependency is checked.

**Activity group assignment**
- Add `activityGroupId` FK to `ChecklistItem` (§4). Allow assigning a task to a group from the Add/Edit modal.

**Phase assignment**
- Add `phase PlanningPhase` to `ChecklistItem` (§3). Allow assigning a task to a phase.

**Final check flag**
- Add `isFinalCheck Boolean` to `ChecklistItem`. Final-check items are pinned to the bottom of their group with a distinct style (e.g. red border).

**Priority and ordering**
- `priority` and `order` fields exist. Add drag-and-drop reorder within a group.

**Reminders**
- Add `Reminder { id, checklistItemId, triggerAt, channel (push|sms|email), sent Boolean }` model and a cron job that fires reminders.

---

## 9. Appointments Management

**Status: Not implemented.**

### Changes needed

**Schema**
- Add `Appointment { id, weddingId, title, description String?, vendorId String?, location String?, startAt DateTime, endAt DateTime?, reminderAt DateTime?, status (SCHEDULED|COMPLETED|CANCELLED), notes String?, createdBy String }` model.

**UI**
- Add `/dashboard/[weddingId]/appointments` page with a calendar-style list view (grouped by month).
- Each appointment shows: title, vendor link (if any), location, time, status badge, and a "Set reminder" toggle.
- "Book appointment" modal with fields: title, vendor (optional dropdown), date/time, location, reminder offset (1 day before / 1 week before / custom).
- Reminder banner on the dashboard: "You have X appointments in the next 7 days."
- Integrate with the cron reminder system (§8).

**Template-driven appointment suggestions**
- When a vendor is added in a category that typically requires appointments (e.g. Attire, Hair & Makeup, Cake tasting), auto-suggest creating an appointment: "Don't forget to book a fitting with [vendor name]."
- Surface these suggestions as dismissible cards on the Appointments page and on the vendor detail view.

**Sidebar nav**
- Add "Appointments" nav item with a badge showing upcoming count.

---

## 10. Template System

**Status: Not implemented.**

### Changes needed

**Schema**
- Add `Template { id, type (CHECKLIST|BUDGET|TIMELINE|VENDOR_LIST|APPOINTMENT|ACTIVITY_GROUP|GUEST_TAGS), name, culturalType CulturalType?, guestSizeMin Int?, guestSizeMax Int?, phase PlanningPhase?, data Json, isSystem Boolean @default(true) }`.
- Add `TemplateApplication { id, weddingId, templateId, appliedAt }` (audit trail).

**Seeded system templates — Checklist**
- 12-month master wedding checklist (tagged by phase and activity group)
- 6-month checklist
- 1-month final tasks
- Ruracio ceremony checklist
- Wedding day checklist (with final-check items per activity group)
- Reception checklist
- Bride preparation checklist
- Venue preparation checklist
- Logistics checklist

**Seeded system templates — Budget**
- Basic wedding budget (categories + suggested % allocations)
- Luxury breakdown
- Traditional ceremony budget (dowry line items included)
- Budget by phase

**Seeded system templates — Vendor list**
- Standard vendor categories pre-filled
- Traditional ceremony vendor list

**Seeded system templates — Timeline**
- Church ceremony day-of timeline
- Outdoor wedding timeline
- Multi-event (Ruracio + Wedding) timeline
- Bride preparation timeline

**Seeded system templates — Activity groups**
- Default group set (§4) pre-seeded per cultural type

**Seeded system templates — Appointments**
- Suggested appointment list: venue visit, cake tasting, dress fitting ×3, hair & makeup trial, photographer meeting, catering tasting

**UI**
- "Load template" button on Checklist, Budget, Timeline, and Appointments pages.
- Templates generate fully editable instances — no locked fields.
- Onboarding step 3: offer 3–5 template cards based on `culturalType` and `budget` (§20).
- "Save as template" button on Checklist and Budget pages so users can save their own reusable templates.
- Template versioning: track `appliedAt` and allow reverting to the pre-template state via `TemplateApplication`.

---

## 11. Traditional & Cultural Module

**Status: `CulturalType` enum exists. No dedicated UI or data models.**

### Changes needed
- **Dowry / Mahari tracker**: add `DowryItem { id, weddingId, name, quantity, estimatedValue, agreedValue, status (PENDING|AGREED|DELIVERED), notes }` and a `/dashboard/[weddingId]/dowry` page.
- **Multi-ceremony planner**: add pre-built event templates for Ruracio, Kumenya Mucii, and Itara that auto-populate when the user adds a new event of that type (§2).
- **Cultural task templates**: when `culturalType` is set, offer to pre-populate the checklist with tribe-specific tasks (§10).
- **Ankara / Attire coordination**: add `AttireItem { id, weddingId, person, description, fabricSource, tailorVendorId, fittingDate, status }` and a simple list UI under a dedicated Attire tab.
- Show "Dowry" nav item only when `culturalType !== 'STANDARD'`.

---

## 12. Design & Vision Board

**Status: `MediaItem` model exists. No mood board UI.**

### Changes needed
- **Mood board page**: add `/dashboard/[weddingId]/moodboard` with a Pinterest-style grid of uploaded images, categorised by Decor / Outfits / Flowers / Venue / Other.
- **Image upload**: wire the existing `/api/storage/signed-url` endpoint to a drag-and-drop upload component.
- **Color palette**: add `Wedding.palette String[]`. Add a palette editor in Settings.
- **Share with vendors**: generate a read-only token-gated shareable link to the mood board.
- **Dashboard preview**: show 4 most recent images on the dashboard (§1).
- Add "Vision Board" nav item to sidebar.

---

## 13. Document Management

**Status: `MediaItem` model exists. No document vault UI.**

### Changes needed
- **Document vault page**: add `/dashboard/[weddingId]/documents` with categorised file list (Contracts, Permits, IDs, Certificates).
- **Upload UI**: reuse signed-URL flow. Tag each `MediaItem` with `linkedToType = "document"` and a `category` field.
- **Access control**: respect `isPrivate` flag — private documents only visible to COUPLE/PLANNER.
- **Offline download**: "Save for offline" button that caches the file locally.
- Add "Documents" nav item to sidebar.

---

## 14. Gift & Registry

**Status: Not implemented.**

### Changes needed
- Add schema models:
  - `GiftRegistryItem { id, weddingId, name, description, url, estimatedPrice, quantity, priority }`
  - `GiftReceived { id, weddingId, guestId?, giverName, description, estimatedValue, status (RECEIVED|THANKED|RETURNED), receivedAt, thankYouSent Boolean, thankYouSentAt DateTime? }`
- Add `/dashboard/[weddingId]/gifts` page with Registry and Received tabs.
- **Thank-you tracker**: checklist of unsent thank-you messages.
- Add "Gifts" nav item to sidebar.

---

## 15. Logistics & Transport

**Status: Not implemented.**

### Changes needed
- Add schema models:
  - `TransportRoute { id, weddingId, name, departureLocation, arrivalLocation, departureTime, capacity, assignedVendorId }`
  - `GuestTransport { id, guestId, routeId }`
  - `Accommodation { id, weddingId, hotelName, address, checkIn, checkOut, roomsBlocked, notes }`
  - `GuestAccommodation { id, guestId, accommodationId, roomNumber }`
- Add `/dashboard/[weddingId]/logistics` page with Transport and Accommodation tabs.
- Add "Logistics" nav item to sidebar.

---

## 16. Post-Wedding & New Home

**Status: Not implemented.**

### Changes needed
- Add `MOVING` to `EventType` enum.
- "New Home Setup" event type reuses the checklist system with pre-built categories: Utilities, Essentials, Furniture.
- Add moving checklist template (packing, transport, setup).
- **Registry-to-inventory sync**: "Mark as home inventory" action on the Gifts page.

---

## 17. Honeymoon Planner

**Status: Not implemented.**

### Changes needed
- Add `HONEYMOON` to `EventType` enum.
- Itinerary builder: `HoneymoonDay { id, eventId, date, title, description, location, mapUrl }`.
- Document attachment for passports, insurance, tickets (reuse `MediaItem`).
- Packing checklist template pre-populated for travel.

---

## 18. Role & Permission System

**Status: `UserRole` and `WeddingMember` exist. No permission enforcement in the UI.**

### Changes needed
- **Permission middleware**: `lib/permissions.ts` mapping `UserRole` to allowed actions.
- **Financial visibility**: add `WeddingMember.canViewFinancials Boolean`. Gate Budget and Payments pages.
- **Private notes**: add `isPrivate Boolean` to `ChecklistItem`, `TimelineEvent`, `Vendor` notes.
- **Invite flow**: `/api/weddings/[id]/invite` endpoint + "Invite member" UI in Settings.
- **Member list in Settings**: show `WeddingMember` list with role badges and remove button.

---

## 19. Day-of Execution System

**Status: Not implemented.**

### Changes needed
- Add `/dashboard/[weddingId]/day-of` page:
  - Live timeline with real-time status (started / done)
  - Role assignment per event (`TimelineEvent.assignedRoleName String?`)
  - Incident log: `Incident { id, weddingId, reportedAt, description, severity, resolvedAt, resolvedBy, resolution }`
  - Emergency contacts quick-dial panel (all vendor phones in one view)
  - Floating "Emergency" button → modal with backup vendors
  - Full offline support — pre-flight "Download for offline" check
- Add "Day-of" nav item to sidebar.

---

## 20. Analytics & Reporting

**Status: Basic stat cards exist. No dedicated analytics page.**

### Changes needed
- Add `/dashboard/[weddingId]/analytics` page:
  - Budget breakdown doughnut chart (by category and by phase)
  - Guest distribution bar chart (confirmed / pending / declined by side)
  - Cost per guest
  - Spending trend over time (payments by week)
  - Vendor status summary
  - Task completion by phase and activity group
- Add Recharts to dependencies.
- Add "Analytics" nav item to sidebar.

---

## 21. Automation & Intelligence

**Status: Risk engine exists. Smart recommendations missing.**

### Changes needed
- **Extended risk rules** in `lib/risk-engine.ts`:
  - No catering vendor confirmed with <60 days to go
  - Guest count exceeds venue capacity
  - Budget committed >90% with >3 months remaining
  - No photographer booked
  - Checklist <30% complete with <30 days to go
  - No appointments booked for Attire/Hair & Makeup with <90 days to go
- **Smart recommendations**: `/api/weddings/[id]/recommendations` endpoint returning vendor suggestions and budget reallocation hints.
- **Auto-generated checklists**: when `culturalType` or guest size changes, offer to append relevant template tasks.
- **Appointment reminders**: cron job that fires reminders for upcoming appointments (§9).
- **SMS parsing for M-Pesa**: webhook that parses M-Pesa confirmation SMS and auto-reconciles payments.

---

## 22. Integrations

**Status: M-Pesa and Supabase Storage integrated. Calendar and Maps missing.**

### Changes needed
- **Google Calendar sync**: add OAuth `calendar.events` scope. "Sync to Google Calendar" button on Timeline page.
- **Google Maps links**: add `mapUrl` to `WeddingEvent`, `TimelineEvent`, `Accommodation`, `Appointment`. Render as "Get directions" link.
- **WhatsApp templates**: pre-filled deep links for RSVP reminder, payment reminder, vendor confirmation on guest and vendor rows.

---

## 23. Onboarding Improvements

**Status: Basic single-page form.**

### Changes needed
- Multi-step wizard:
  1. Wedding basics (name, date, venue, budget)
  2. Cultural type + expected guest count
  3. Template selection based on answers
  4. Invite co-planner (optional)
- Add `Wedding.setupComplete Boolean`. Show "Complete your setup" banner on dashboard until done.
- Smart budget allocation suggestion at end of onboarding.
- Replace bare `alert()` in `app/onboarding/page.tsx` with the toast system.

---

## 24. Code Quality & Technical Debt

- `app/dashboard/[weddingId]/timeline/page.tsx`: remove unused imports (`Card`, `CardHeader`, `CardContent`, `CardTitle`); mark `props` as `Readonly`; replace nested ternary; add comparator to `.sort()`.
- All `<label>` elements without `htmlFor` need to be associated with their inputs.
- `React.FormEvent` deprecation — migrate to `React.SyntheticEvent<HTMLFormElement>` consistently.
- Vendor page `VendorsPage` and `AddVendorModal` props not marked `Readonly`.
- Add `loading.tsx` skeleton files for each dashboard route segment.
- Add `error.tsx` boundary files for each dashboard route segment.
- Investigate and remove `proxy.ts` at the root if unused.
- `lib/sync/engine.ts` — verify circuit breaker reset logic; add unit tests.
- Replace all unguarded `parseInt` / `parseFloat` calls with a shared `parseNumber(val, fallback)` utility.

---

## 25. Missing Navigation Items

Current sidebar: Dashboard, Guests, Check-in, Vendors, Timeline, Budget, Checklist, Payments, Risk Alerts, Settings.

Add when pages are built:
- Events
- Appointments (with upcoming count badge)
- Vision Board
- Documents
- Gifts
- Logistics
- Analytics
- Day-of Execution
- Dowry (conditional on `culturalType !== 'STANDARD'`)

---

## Schema Changes Summary

All new/modified models in one place for the migration:

```prisma
// Enums — additions
enum EventType      { ..., ENGAGEMENT, AFTER_PARTY, HONEYMOON, MOVING }
enum PlanningPhase  { BUDGETING, PLANNING, PRE_WEDDING, PROCUREMENT, DAY_OF, POST_WEDDING }
enum GuestPriority  { VIP, GENERAL, OVERFLOW }

// New fields on existing models
Wedding             { couplePhotoPath String?, expectedGuestCount Int?,
                      uninvitedBuffer Int @default(15), palette String[],
                      setupComplete Boolean @default(false) }
Guest               { plusOneOf String?, plusOneAllowed Boolean @default(false),
                      priority GuestPriority @default(GENERAL),
                      householdId String? }
ChecklistItem       { phase PlanningPhase?, activityGroupId String?,
                      assignedToName String?, dependsOnId String?,
                      isFinalCheck Boolean @default(false) }
BudgetLine          { eventId String?, phase PlanningPhase? }
TimelineEvent       { eventId String?, assignedRoleName String? }
Vendor              { description String?, isBackup Boolean @default(false) }
WeddingMember       { canViewFinancials Boolean @default(true) }

// New models
ActivityGroup       { id, weddingId, name, phase PlanningPhase, color, order }
VendorNote          { id, vendorId, weddingId, content, createdBy, createdAt }
GuestEventAttendance{ id, guestId, eventId, rsvpStatus }
EventDependency     { id, fromEventId, toEventId, type }
Household           { id, weddingId, name }
PaymentSchedule     { id, vendorId, weddingId, dueDate, amount, isPaid }
Appointment         { id, weddingId, title, description, vendorId, location,
                      startAt, endAt, reminderAt, status, notes, createdBy }
Reminder            { id, checklistItemId, appointmentId, triggerAt,
                      channel, sent Boolean }
Incident            { id, weddingId, reportedAt, description, severity,
                      resolvedAt, resolvedBy, resolution }
Template            { id, type, name, culturalType, guestSizeMin, guestSizeMax,
                      phase, data Json, isSystem Boolean }
TemplateApplication { id, weddingId, templateId, appliedAt }
DowryItem           { id, weddingId, name, quantity, estimatedValue,
                      agreedValue, status, notes }
AttireItem          { id, weddingId, person, description, fabricSource,
                      tailorVendorId, fittingDate, status }
GiftRegistryItem    { id, weddingId, name, description, url,
                      estimatedPrice, quantity, priority }
GiftReceived        { id, weddingId, guestId, giverName, description,
                      estimatedValue, status, receivedAt,
                      thankYouSent, thankYouSentAt }
TransportRoute      { id, weddingId, name, departureLocation,
                      arrivalLocation, departureTime, capacity, assignedVendorId }
GuestTransport      { id, guestId, routeId }
Accommodation       { id, weddingId, hotelName, address, checkIn,
                      checkOut, roomsBlocked, notes }
GuestAccommodation  { id, guestId, accommodationId, roomNumber }
HoneymoonDay        { id, eventId, date, title, description, location, mapUrl }
```

---

## Priority Order for Implementation

1. Schema migration (all new fields and models above) — unblocks everything
2. UI design system update (§26) — affects every screen; do this before building new pages
3. Planning phases + activity groups — structural change that affects checklist, budget, and dashboard
4. Template system — needed for onboarding and cultural module; highest "foolproof" value
5. Dashboard enhancements (couple photo, analytics widgets, vision board preview)
6. Appointments management
7. Checklist: person-in-charge, dependencies, activity groups, final checks
8. Vendor: description + notes log
9. Guest: expected count input, tags, plus-one, household grouping
10. Day-of execution system
11. Role & permission enforcement
12. Traditional / Cultural module (Dowry, Ankara)
13. Vision Board (mood board page)
14. Document vault
15. Gift & Registry
16. Logistics & Transport
17. Analytics page
18. Honeymoon planner
19. Post-wedding / New home
20. Google Calendar + Maps integrations
21. Code quality fixes (run in parallel throughout)

---

## 26. UI Redesign — Editorial Light-Mode System

**Status: Partially started. `globals.css` has the correct color tokens and `components/ui/index.tsx` has been partially updated. Layout is still card-heavy and symmetrical. `components/sidebar.tsx` has a corrupted duplicate block that must be fixed.**

The goal is a calm, editorial interface — closer to a curated magazine layout than a SaaS dashboard. Every screen should feel intentional, not boxed-in.

---

### 26.1 Design Tokens (already in `globals.css` — verify and extend)

The CSS custom properties in `globals.css` are correct. Ensure they are used consistently everywhere instead of hardcoded Tailwind colors:

```css
--bg:               40 20% 97%    /* soft warm white — page background */
--surface:          0 0% 100%     /* pure white — panels only where needed */
--border:           220 13% 91%   /* subtle divider */
--text-primary:     228 14% 10%   /* #14161C deep navy */
--text-secondary:   220 9% 46%    /* body copy */
--text-muted:       220 9% 64%    /* meta / placeholder */
--accent-lavender:  263 52% 83%   /* #CDB5F7 — used sparingly for highlights */
--accent-yellow:    48 68% 87%    /* #E5DF98 — used sparingly for warmth */
--primary:          263 68% 58%   /* violet-600 — interactive elements */
```

Add two new tokens:
```css
--surface-subtle:   220 14% 96%   /* slightly off-white for section backgrounds */
--accent-lavender-fg: 263 52% 35% /* dark lavender for text on lavender bg */
```

**Audit**: grep for hardcoded `bg-zinc-*`, `text-zinc-*`, `border-zinc-*` across all pages and replace with semantic token classes (`bg-app`, `bg-surface`, `text-primary`, `text-secondary`, `text-muted-ui`). Add the missing utility classes to `globals.css`:

```css
.bg-surface-subtle { background-color: hsl(var(--surface-subtle)); }
.text-accent-lavender { color: hsl(var(--accent-lavender-fg)); }
.border-subtle { border-color: hsl(var(--border)); }
```

---

### 26.2 Typography

**Font**: Plus Jakarta Sans is already referenced via `var(--font-jakarta)`. Verify it is loaded in `app/layout.tsx` via `next/font/google`. If not, add it.

**Scale** — enforce these classes consistently:

| Role | Class |
|---|---|
| Page title | `text-3xl font-bold tracking-tight text-[#14161C]` |
| Section heading | `text-xl font-semibold text-[#14161C]` |
| Card / group label | `text-sm font-semibold text-[#14161C]` |
| Body | `text-sm text-secondary` |
| Meta / caption | `text-xs text-muted-ui` |
| Stat value | `text-3xl font-bold leading-none` |
| Stat label | `text-xs font-semibold uppercase tracking-widest text-muted-ui` |

**Rule**: typography carries structure. Do not wrap a heading in a card just to give it visual weight — use size and spacing instead.

---

### 26.3 Layout Principles

**Asymmetry over symmetry**
- Dashboard: use a `grid-cols-[2fr_1fr]` split at `lg` breakpoint — main content left, contextual panel right. Not a uniform 4-column grid.
- Checklist / Budget: wide content column with a narrow sticky summary sidebar on desktop.
- Avoid `grid-cols-4 gap-3` stat grids — replace with an open horizontal row using `flex gap-8 divide-x` or staggered vertical rhythm.

**No card by default**
- The `Card` component in `components/ui/index.tsx` already has a minimal style (`bg-white rounded-2xl border border-zinc-100`). The rule is: only use `Card` where true visual separation is needed (e.g. a data table, a modal-like panel).
- For grouping related content: use spacing (`space-y-6`), a `<hr className="section-divider" />`, or a subtle background shift (`bg-surface-subtle rounded-2xl p-6`) instead of a bordered card.
- Remove `Card` wrappers from: stat rows, filter bars, simple lists that don't need containment.

**Whitespace as structure**
- Page padding: `px-6 py-8 md:px-10` (more generous than current `p-4 md:p-6`).
- Section spacing: `space-y-10` between major sections, `space-y-4` within a section.
- Let sections breathe — no back-to-back cards with identical spacing.

**Visual flow**
- Each page should have one dominant element (the hero stat, the couple photo, the timeline) that anchors the eye.
- Secondary content flows below or beside it, not in an equal-weight grid.

---

### 26.4 Component Updates — `components/ui/index.tsx`

**Fix all `Readonly` prop warnings** (linter is already flagging these):
- Wrap every function component's props type in `Readonly<{...}>`.

**`StatCard`** — current implementation is already open (no card box). Keep it. Fix:
- Remove the unused `color` parameter from `ProgressBar`.
- Extract the nested ternary in `ProgressBar` into a `getBarColor(pct)` helper.

**`Card`** — add a `ghost` variant for background-only grouping (no border):
```tsx
export function Card({ variant = 'default', className, children, ...props }) {
  const variants = {
    default: 'bg-white rounded-2xl border border-zinc-100',
    ghost:   'bg-[hsl(var(--surface-subtle))] rounded-2xl',
    flush:   'bg-white',  // no radius, for full-bleed sections
  }
  ...
}
```

**New `Divider` component**:
```tsx
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('section-divider my-6', className)} />
}
```

**New `PageHeader` component** — standardises the title + subtitle + action pattern used on every page:
```tsx
export function PageHeader({ title, subtitle, action, children }: Readonly<{
  title: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode
}>) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#14161C]">{title}</h1>
        {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
```

**New `SectionLabel` component** — replaces `CardTitle` for open-layout section headings:
```tsx
export function SectionLabel({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <p className={cn('text-xs font-semibold uppercase tracking-widest text-muted-ui mb-3', className)}>{children}</p>
}
```

**`Modal`** — already good. Add slide-up animation on mobile:
```css
/* globals.css */
@keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
.modal-slide-up { animation: slide-up 0.2s ease-out; }
```
Apply `sm:animate-none modal-slide-up` to the modal panel div.

**`Button`** — already correct. Ensure `lavender` variant is used for secondary actions on light backgrounds instead of `secondary` (which is zinc-100).

**`Input` / `Select` / `Textarea`** — already correct. No changes needed.

---

### 26.5 Sidebar — `components/sidebar.tsx`

**Critical bug**: the file has a corrupted duplicate block starting after the first `MobileMenuButton` export. The entire second half of the file (from the second `import { useWeddingStore }` line onward) must be deleted.

**Design updates** (after fixing the corruption):
- Width stays at `w-60`.
- Background: `bg-white border-r border-[hsl(var(--border))]` — already correct.
- Nav item active state: `bg-[#CDB5F7]/20 text-violet-700 font-semibold` — already correct.
- Add nav group labels to separate sections visually:
  ```
  [Overview]
  ── PLANNING ──
  [Events] [Checklist] [Timeline] [Appointments]
  ── PEOPLE ──
  [Guests] [Check-in] [Vendors]
  ── FINANCE ──
  [Budget] [Payments]
  ── INSIGHTS ──
  [Risk Alerts] [Analytics]
  ── CONTENT ──
  [Vision Board] [Documents] [Gifts]
  ── LOGISTICS ──
  [Logistics] [Day-of]
  ── SETTINGS ──
  [Settings]
  ```
- Group labels: `text-[10px] font-bold uppercase tracking-widest text-zinc-300 px-3 pt-4 pb-1`.
- Remove the duplicate `DollarSign` icon for Payments — use `CreditCard` from lucide instead.
- Add conditional "Dowry" item: only render when `culturalType !== 'STANDARD'` (pass `culturalType` as a prop to `Sidebar`).

---

### 26.6 Dashboard Layout — `app/dashboard/[weddingId]/dashboard-client.tsx`

Replace the current uniform grid with an asymmetric editorial layout:

```
┌─────────────────────────────────────┬──────────────────┐
│  HERO: Couple photo + wedding name  │  Event countdown │
│  + days-to-go (large)               │  list (stacked)  │
├─────────────────────────────────────┴──────────────────┤
│  Open stat row (no cards):                              │
│  Guests confirmed · Vendors ready · Budget used · Risks │
├──────────────────────────────────┬─────────────────────┤
│  Budget doughnut chart (2/3)     │  RSVP funnel (1/3)  │
├──────────────────────────────────┴─────────────────────┤
│  Phase progress pills (full width, horizontal scroll)   │
├──────────────────────────────────┬─────────────────────┤
│  Upcoming deadlines (2/3)        │  Vision board       │
│                                  │  preview 2×2 (1/3)  │
├──────────────────────────────────┴─────────────────────┤
│  What's at risk (full width, only if risks exist)       │
└─────────────────────────────────────────────────────────┘
```

- Hero section: `grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8`.
- Stat row: `flex gap-8 divide-x divide-[hsl(var(--border))] py-6` — each stat is a `StatCard` with `px-8 first:pl-0`.
- Charts section: `grid grid-cols-1 lg:grid-cols-3 gap-8` — budget chart spans 2 cols, RSVP spans 1.
- Phase pills: `flex gap-2 overflow-x-auto pb-2 scrollbar-thin` — each pill is a rounded chip with phase name, fraction, and a mini progress arc.
- Deadlines + vision board: `grid grid-cols-1 lg:grid-cols-3 gap-8` — deadlines span 2, vision board spans 1.
- Risk panel: only render if `recentRisks.length > 0`. Use a `bg-red-50/50 rounded-2xl p-6` background shift instead of a card border.

---

### 26.7 Page-Level Layout Pattern

Apply this pattern consistently to every dashboard page:

```tsx
// Standard page shell — no Card wrapper around the whole page
<div className="px-6 py-8 md:px-10 max-w-6xl mx-auto">
  <PageHeader title="Budget" subtitle="24 line items" action={<Button>Add line</Button>} />
  
  {/* Open stat row */}
  <div className="flex gap-8 divide-x divide-[hsl(var(--border))] mb-10">
    <StatCard label="Total budget" value={fmt(total)} />
    <StatCard label="Spent" value={fmt(spent)} color="red" />
    ...
  </div>

  <Divider />

  {/* Main content — Card only where a data table needs containment */}
  <Card className="mt-6">
    ...table rows...
  </Card>
</div>
```

**Per-page specifics:**

- **Budget**: replace the 4-card stat grid with an open stat row. Keep the category breakdown cards (they contain data tables). Add a `ghost` Card variant for the progress section.
- **Guests**: replace the 4-card stat grid with an open stat row. The guest list table stays in a `Card`. Filters move to an inline toolbar above the card, not inside it.
- **Checklist**: phase tabs at the top (pill style, not boxed). Activity groups use `ghost` Card variant with a coloured left border accent. Final-check items have a `border-l-2 border-red-400` treatment.
- **Timeline**: keep the vertical stem layout. Remove the unused `Card` imports. Add a date-jump sidebar on desktop (sticky list of days).
- **Vendors**: vendor cards become horizontal rows in a list, not a grid of cards. Detail expands inline (accordion) rather than a separate page.
- **Payments**: tabs stay. Payment rows stay. Replace the 4-card stat grid with an open stat row.
- **Risks**: remove the card wrapper from each risk item. Use a left-border color treatment: `border-l-4 border-red-400 pl-4 py-3` for CRITICAL, `border-amber-400` for HIGH, etc.

---

### 26.8 New Dependencies to Add

```json
"recharts": "^2.12.0",
"@dnd-kit/core": "^6.1.0",
"@dnd-kit/sortable": "^8.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

Add to `package.json` dependencies. Run `pnpm install`.

---

### 26.9 What to Avoid (enforced by code review)

- No `dark:` variants — this is a light-mode-only product. Remove all existing `dark:` classes.
- No `shadow-*` classes except `shadow-sm` on modals and dropdowns.
- No `bg-zinc-950` or `bg-zinc-900` anywhere in the dashboard (those belong to the login/onboarding dark screens only).
- No uniform `grid-cols-4` stat grids — use the open stat row pattern.
- No back-to-back `Card` components with identical padding — use spacing or a divider instead.
- No `text-violet-*` for body copy — violet is reserved for interactive/active states only.
