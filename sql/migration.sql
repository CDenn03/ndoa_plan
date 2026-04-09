-- ─────────────────────────────────────────────────────────────────────────────
-- Ndoa Wedding Platform — full database migration
-- Idempotent: safe to run on existing databases
-- Run via: psql $DIRECT_URL -f sql/migration.sql
--      or: Neon/Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ProcessedOperation (idempotency store) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProcessedOperation" (
  "operationId"     TEXT        PRIMARY KEY,
  "processedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resultCode"      INTEGER     NOT NULL DEFAULT 200,
  "resultServerId"  TEXT,
  "resultVersion"   INTEGER
);
CREATE INDEX IF NOT EXISTS "processed_op_processed_at"
  ON "ProcessedOperation" ("processedAt");

-- ── AuditLog (immutable append-only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "weddingId"    UUID        NOT NULL,
  "actorId"      TEXT        NOT NULL,
  "actorRole"    TEXT        NOT NULL,
  "action"       TEXT        NOT NULL,
  "resourceId"   TEXT        NOT NULL,
  "resourceType" TEXT        NOT NULL,
  "ipAddress"    TEXT,
  "prevState"    TEXT,
  "nextState"    TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_wedding_created"
  ON "AuditLog" ("weddingId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_resource"
  ON "AuditLog" ("resourceId", "resourceType");

-- Prevent edits/deletes to audit log rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'audit_no_update') THEN
    CREATE RULE "audit_no_update" AS ON UPDATE TO "AuditLog" DO INSTEAD NOTHING;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'audit_no_delete') THEN
    CREATE RULE "audit_no_delete" AS ON DELETE TO "AuditLog" DO INSTEAD NOTHING;
  END IF;
END $$;

-- ── Add version/checksum/softDelete to existing entity tables ─────────────────
-- Guest
ALTER TABLE "Guest"
  ADD COLUMN IF NOT EXISTS "version"   INTEGER     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "checksum"  TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "localId"   TEXT;

-- Vendor
ALTER TABLE "Vendor"
  ADD COLUMN IF NOT EXISTS "version"       INTEGER     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "checksum"      TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "updatedBy"     TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "deletedBy"     TEXT;

-- TimelineEvent
ALTER TABLE "TimelineEvent"
  ADD COLUMN IF NOT EXISTS "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "checksum"  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- ChecklistItem
ALTER TABLE "ChecklistItem"
  ADD COLUMN IF NOT EXISTS "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "checksum"  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- BudgetLine
ALTER TABLE "BudgetLine"
  ADD COLUMN IF NOT EXISTS "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "checksum"  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- ── Payment hardening ─────────────────────────────────────────────────────────
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "idempotencyKey"    TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "rawCallback"       JSONB,
  ADD COLUMN IF NOT EXISTS "reconciledAt"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "version"           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "deletedAt"         TIMESTAMPTZ;

-- Unique constraint on mpesaRef (run cleanup first if duplicates exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_mpesa_ref_unique'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "payment_mpesa_ref_unique" UNIQUE ("mpesaRef");
  END IF;
END $$;

-- ── Performance indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "guest_wedding_rsvp"    ON "Guest"     ("weddingId", "rsvpStatus");
CREATE INDEX IF NOT EXISTS "guest_wedding_table"   ON "Guest"     ("weddingId", "tableNumber");
CREATE INDEX IF NOT EXISTS "guest_wedding_updated" ON "Guest"     ("weddingId", "updatedAt");
CREATE INDEX IF NOT EXISTS "vendor_wedding_status" ON "Vendor"    ("weddingId", "status");
CREATE INDEX IF NOT EXISTS "vendor_wedding_cat"    ON "Vendor"    ("weddingId", "category");
CREATE INDEX IF NOT EXISTS "timeline_wedding_time" ON "TimelineEvent" ("weddingId", "startTime");
CREATE INDEX IF NOT EXISTS "checklist_wedding_done" ON "ChecklistItem" ("weddingId", "isChecked");
CREATE INDEX IF NOT EXISTS "checklist_wedding_due"  ON "ChecklistItem" ("weddingId", "dueDate");
CREATE INDEX IF NOT EXISTS "budget_wedding_cat"    ON "BudgetLine" ("weddingId", "category");
CREATE INDEX IF NOT EXISTS "payment_wedding_date"  ON "Payment"   ("weddingId", "createdAt");
CREATE INDEX IF NOT EXISTS "payment_wedding_status" ON "Payment"  ("weddingId", "status");
CREATE INDEX IF NOT EXISTS "risk_wedding_resolved" ON "RiskAlert" ("weddingId", "isResolved");

-- ── Make Supabase Storage buckets private ─────────────────────────────────────
UPDATE storage.buckets
  SET public = false
  WHERE name IN ('documents', 'contracts', 'receipts', 'media');

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE "Guest"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetLine"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimelineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskAlert"     ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "guest_isolation"     ON "Guest";
  DROP POLICY IF EXISTS "vendor_isolation"    ON "Vendor";
  DROP POLICY IF EXISTS "payment_isolation"   ON "Payment";
  DROP POLICY IF EXISTS "budget_isolation"    ON "BudgetLine";
  DROP POLICY IF EXISTS "timeline_isolation"  ON "TimelineEvent";
  DROP POLICY IF EXISTS "checklist_isolation" ON "ChecklistItem";
  DROP POLICY IF EXISTS "risk_isolation"      ON "RiskAlert";
END $$;

CREATE POLICY "guest_isolation"     ON "Guest"         USING ("weddingId"::text = current_setting('app.wedding_id', true));
CREATE POLICY "vendor_isolation"    ON "Vendor"        USING ("weddingId"::text = current_setting('app.wedding_id', true));
CREATE POLICY "payment_isolation"   ON "Payment"       USING ("weddingId"::text = current_setting('app.wedding_id', true));
CREATE POLICY "budget_isolation"    ON "BudgetLine"    USING ("weddingId"::text = current_setting('app.wedding_id', true));
CREATE POLICY "timeline_isolation"  ON "TimelineEvent" USING ("weddingId"::text = current_setting('app.wedding_id', true));
CREATE POLICY "checklist_isolation" ON "ChecklistItem" USING ("weddingId"::text = current_setting('app.wedding_id', true));
CREATE POLICY "risk_isolation"      ON "RiskAlert"     USING ("weddingId"::text = current_setting('app.wedding_id', true));

-- ── Prune cron (requires pg_cron — available on Neon) ─────────────────────────
-- Uncomment to enable:
-- SELECT cron.schedule('prune-processed-ops', '0 */6 * * *',
--   $$ DELETE FROM "ProcessedOperation" WHERE "processedAt" < now() - interval '72 hours' $$);

COMMIT;

-- ── Appointment.eventId (per-event appointment scoping) ───────────────────────
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "eventId" UUID REFERENCES "WeddingEvent"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "appointment_event_id" ON "Appointment" ("eventId");

-- ── EventProgramItem: rename time → startTime, add endTime ───────────────────
ALTER TABLE "EventProgramItem"
  ADD COLUMN IF NOT EXISTS "startTime" TEXT,
  ADD COLUMN IF NOT EXISTS "endTime"   TEXT;

-- Migrate existing time values to startTime
UPDATE "EventProgramItem" SET "startTime" = "time" WHERE "time" IS NOT NULL AND "startTime" IS NULL;
