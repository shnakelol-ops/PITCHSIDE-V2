-- AlterTable
ALTER TABLE "events" ADD COLUMN "player_id" TEXT;

-- CreateIndex
CREATE INDEX "events_player_id_idx" ON "events"("player_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
