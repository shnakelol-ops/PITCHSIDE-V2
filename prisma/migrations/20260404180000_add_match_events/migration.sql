-- CreateEnum
CREATE TYPE "EventType" AS ENUM (
  'shot_point',
  'shot_goal',
  'shot_miss',
  'kickout_won',
  'kickout_lost',
  'turnover_won',
  'turnover_lost',
  'foul_for',
  'foul_against',
  'note'
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "note" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_match_id_idx" ON "events"("match_id");

-- CreateIndex
CREATE INDEX "events_match_id_recorded_at_idx" ON "events"("match_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
