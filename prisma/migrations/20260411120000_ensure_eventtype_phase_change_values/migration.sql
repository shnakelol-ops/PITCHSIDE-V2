-- Idempotent fixes for databases that never applied 20260410120000_event_context_phase_types
-- (or failed partway). Prisma schema + client already expect these values.

-- EventType enum: phase_change, unforced_turnover, unforced_error
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType'
      AND e.enumlabel = 'phase_change'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'phase_change';
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType'
      AND e.enumlabel = 'unforced_turnover'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'unforced_turnover';
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType'
      AND e.enumlabel = 'unforced_error'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'unforced_error';
  END IF;
END
$migration$;

-- Optional JSON context column (safe if already present)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "context" JSONB;
