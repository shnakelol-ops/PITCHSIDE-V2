import { z } from "zod";

export const matchEventTypeSchema = z.enum([
  "shot_point",
  "shot_goal",
  "shot_miss",
  "kickout_won",
  "kickout_lost",
  "turnover_won",
  "turnover_lost",
  "foul_for",
  "foul_against",
  "note",
]);

export type MatchEventType = z.infer<typeof matchEventTypeSchema>;

const optionalPlayerIdSchema = z
  .union([z.string().cuid(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const createMatchEventSchema = z.object({
  matchId: z.string().cuid(),
  type: matchEventTypeSchema,
  playerId: optionalPlayerIdSchema,
  note: z.string().trim().max(5000).optional(),
});

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>;
