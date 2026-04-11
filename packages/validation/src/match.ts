import { z } from "zod";

export const matchPeriodSchema = z.enum([
  "WARMUP",
  "FIRST_HALF",
  "HALF_TIME",
  "SECOND_HALF",
  "EXTRA_TIME_FIRST",
  "EXTRA_TIME_SECOND",
  "PENALTIES",
  "FULL_TIME",
]);

export const createMatchSchema = z.object({
  teamId: z
    .string()
    .trim()
    .min(1, "Team is required")
    .refine((s) => z.string().cuid().safeParse(s).success, {
      message:
        "Team ID must be a database CUID copied from an existing team (Teams page). Short labels like test-team-1 are not valid IDs.",
    }),
  opponentName: z.string().trim().min(1, "Opponent name is required"),
  competition: z.string().trim().optional().default(""),
  venue: z.string().trim().optional().default(""),
  matchDate: z.string().trim().min(1, "Match date is required")
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
