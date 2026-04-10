-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('GAELIC_FOOTBALL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'WARMUP', 'LIVE', 'PAUSED', 'HALF_TIME', 'SECOND_HALF', 'EXTRA_TIME', 'FINISHED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "MatchPeriod" AS ENUM ('WARMUP', 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'EXTRA_TIME_FIRST', 'EXTRA_TIME_SECOND', 'PENALTIES', 'FULL_TIME');

-- CreateEnum
CREATE TYPE "BoardSceneType" AS ENUM ('FORMATION', 'SET_PIECE', 'ANALYSIS', 'REVIEW', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BoardOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE');

-- CreateEnum
CREATE TYPE "BoardObjectType" AS ENUM ('MARKER', 'LINE', 'ARROW', 'SHAPE', 'TEXT', 'IMAGE', 'PATH', 'ZONE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TeamSide" AS ENUM ('HOME', 'AWAY', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "StatEventType" AS ENUM ('GOAL', 'POINT', 'WIDE', 'FOUL', 'KICKOUT', 'KICKIN', 'TURNOVER', 'SCORE_ASSIST', 'SUBSTITUTION', 'YELLOW_CARD', 'RED_CARD', 'PERIOD_START', 'PERIOD_END', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PitchZone" AS ENUM ('DEFENSIVE', 'MIDFIELD', 'ATTACKING', 'WIDE_LEFT', 'WIDE_RIGHT', 'CENTRE', 'GOAL_AREA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReviewSnapshotType" AS ENUM ('PRE_MATCH', 'LIVE', 'HALF_TIME', 'POST_MATCH', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "SportType" NOT NULL DEFAULT 'GAELIC_FOOTBALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "nickname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "opponent_name" TEXT NOT NULL,
    "competition" TEXT,
    "venue" TEXT,
    "match_date" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "current_period" "MatchPeriod",
    "score_for_goals" INTEGER NOT NULL DEFAULT 0,
    "score_for_points" INTEGER NOT NULL DEFAULT 0,
    "score_against_goals" INTEGER NOT NULL DEFAULT 0,
    "score_against_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_squad_players" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "shirt_number" INTEGER,
    "is_starter" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_squad_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_scenes" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "scene_type" "BoardSceneType" NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "orientation" "BoardOrientation" NOT NULL DEFAULT 'LANDSCAPE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_objects" (
    "id" TEXT NOT NULL,
    "board_scene_id" TEXT NOT NULL,
    "object_type" "BoardObjectType" NOT NULL,
    "label" TEXT,
    "team_side" "TeamSide",
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "style_json" JSONB,
    "path_json" JSONB,
    "meta_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stat_events" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT,
    "linked_player_id" TEXT,
    "team_side" "TeamSide" NOT NULL,
    "event_type" "StatEventType" NOT NULL,
    "event_result" TEXT,
    "period" "MatchPeriod" NOT NULL,
    "minute" INTEGER NOT NULL,
    "second" INTEGER,
    "zone" "PitchZone",
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "possession_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stat_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_snapshots" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "snapshot_type" "ReviewSnapshotType" NOT NULL,
    "payload" JSONB,
    "captured_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "teams_user_id_idx" ON "teams"("user_id");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- CreateIndex
CREATE INDEX "matches_team_id_idx" ON "matches"("team_id");

-- CreateIndex
CREATE INDEX "matches_match_date_idx" ON "matches"("match_date");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "match_squad_players_match_id_idx" ON "match_squad_players"("match_id");

-- CreateIndex
CREATE INDEX "match_squad_players_player_id_idx" ON "match_squad_players"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_squad_players_match_id_player_id_key" ON "match_squad_players"("match_id", "player_id");

-- CreateIndex
CREATE INDEX "board_scenes_match_id_idx" ON "board_scenes"("match_id");

-- CreateIndex
CREATE INDEX "board_objects_board_scene_id_idx" ON "board_objects"("board_scene_id");

-- CreateIndex
CREATE INDEX "stat_events_match_id_idx" ON "stat_events"("match_id");

-- CreateIndex
CREATE INDEX "stat_events_player_id_idx" ON "stat_events"("player_id");

-- CreateIndex
CREATE INDEX "stat_events_linked_player_id_idx" ON "stat_events"("linked_player_id");

-- CreateIndex
CREATE INDEX "stat_events_event_type_idx" ON "stat_events"("event_type");

-- CreateIndex
CREATE INDEX "stat_events_period_idx" ON "stat_events"("period");

-- CreateIndex
CREATE INDEX "review_snapshots_match_id_idx" ON "review_snapshots"("match_id");

-- CreateIndex
CREATE INDEX "review_snapshots_snapshot_type_idx" ON "review_snapshots"("snapshot_type");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_squad_players" ADD CONSTRAINT "match_squad_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_squad_players" ADD CONSTRAINT "match_squad_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_scenes" ADD CONSTRAINT "board_scenes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_objects" ADD CONSTRAINT "board_objects_board_scene_id_fkey" FOREIGN KEY ("board_scene_id") REFERENCES "board_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stat_events" ADD CONSTRAINT "stat_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stat_events" ADD CONSTRAINT "stat_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stat_events" ADD CONSTRAINT "stat_events_linked_player_id_fkey" FOREIGN KEY ("linked_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_snapshots" ADD CONSTRAINT "review_snapshots_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
