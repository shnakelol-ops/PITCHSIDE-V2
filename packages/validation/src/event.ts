import { z } from "zod";

import { matchPeriodSchema } from "./match";

export const matchEventTypeSchema = z.enum([
  "shot_point",
  "shot_goal",
  "shot_miss",
  "shot_two_pointer",
  "kickout_won",
  "kickout_lost",
  "turnover_won",
  "turnover_lost",
  "unforced_turnover",
  "foul_for",
  "foul_against",
  "unforced_error",
  "note",
  "phase_change",
]);

export type MatchEventType = z.infer<typeof matchEventTypeSchema>;

const optionalPlayerIdSchema = z
  .union([z.string().cuid(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const logTacticalPhaseSchema = z.enum([
  "attack",
  "defence",
  "transition",
  "set_play",
]);

export const matchEventContextSchema = z
  .object({
    matchPeriod: matchPeriodSchema.optional(),
    clockLabel: z.string().trim().max(32).optional(),
    pitchZone: z.enum(["attack", "midfield", "defence"]).optional(),
    pitchLane: z.enum(["left", "centre", "right"]).optional(),
    pitchSide: z.enum(["own", "opp", "neutral"]).optional(),
    /** Event-first quick log (optional JSON fields for analytics / maps). */
    logEventType: z.string().trim().max(32).optional(),
    logSubAction: z.string().trim().max(64).optional(),
    logNormX: z.number().min(0).max(1).optional(),
    logNormY: z.number().min(0).max(1).optional(),
    logDerivedZone: z.string().trim().max(64).optional(),
    logTacticalPhase: logTacticalPhaseSchema.optional(),
    logPlayerNumber: z.number().int().min(0).max(99).optional(),
  })
  .strict();

export type MatchEventContext = z.infer<typeof matchEventContextSchema>;

export const createMatchEventSchema = z
  .object({
    matchId: z.string().cuid(),
    type: matchEventTypeSchema,
    playerId: optionalPlayerIdSchema,
    note: z.string().trim().max(5000).optional(),
    context: matchEventContextSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "phase_change") {
      if (!data.context?.matchPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "context.matchPeriod is required for phase_change events.",
          path: ["context", "matchPeriod"],
        });
      }
      if (data.playerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "playerId must not be set for phase_change events.",
          path: ["playerId"],
        });
      }
    }
  });

export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>;
