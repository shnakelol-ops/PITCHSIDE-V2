-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'phase_change';
ALTER TYPE "EventType" ADD VALUE 'unforced_turnover';
ALTER TYPE "EventType" ADD VALUE 'unforced_error';

-- AlterTable
ALTER TABLE "events" ADD COLUMN "context" JSONB;
