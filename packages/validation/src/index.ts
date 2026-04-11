import { z } from "zod";

export const cuidSchema = z.string().cuid();

export const optionalStringSchema = z
  .string()
  .trim()
  .max(10_000)
  .optional();

export const requiredStringSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(10_000);

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Invalid hex color");

export const coordinatesSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const paginationSchema = z.object({
  cursor: optionalStringSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const teamSideSchema = z.enum(["HOME", "AWAY", "NEUTRAL"]);

export const pitchZoneSchema = z.enum([
  "DEFENSIVE",
  "MIDFIELD",
  "ATTACKING",
  "WIDE_LEFT",
  "WIDE_RIGHT",
  "CENTRE",
  "GOAL_AREA",
  "CUSTOM",
]);

export const statEventTypeSchema = z.enum([
  "GOAL",
  "POINT",
  "WIDE",
  "FOUL",
  "KICKOUT",
  "KICKIN",
  "TURNOVER",
  "SCORE_ASSIST",
  "SUBSTITUTION",
  "YELLOW_CARD",
  "RED_CARD",
  "PERIOD_START",
  "PERIOD_END",
  "CUSTOM",
]);

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  code: z.enum([
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION_ERROR",
    "CONFLICT",
    "RATE_LIMITED",
    "INTERNAL_ERROR",
  ]),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().optional(),
});

export * from "./board";
export * from "./event";
export * from "./match";
