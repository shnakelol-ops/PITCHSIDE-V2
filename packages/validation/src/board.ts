import { z } from "zod";

const teamSideSchema = z.enum(["HOME", "AWAY", "NEUTRAL"]);

export const boardMarkerInputSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  label: z.string().trim().min(1).max(8),
  teamSide: teamSideSchema,
});

export const boardDrawingInputSchema = z.object({
  kind: z.enum(["line", "arrow"]),
  x1: z.number().finite().min(0).max(1),
  y1: z.number().finite().min(0).max(1),
  x2: z.number().finite().min(0).max(1),
  y2: z.number().finite().min(0).max(1),
});

export const saveBoardV1Schema = z.object({
  sceneId: z.string().cuid(),
  markers: z.array(boardMarkerInputSchema).min(0).max(40),
  drawings: z.array(boardDrawingInputSchema).min(0).max(80).default([]),
});

export const createBoardSceneSchema = z.object({
  sourceSceneId: z.string().cuid(),
  markers: z.array(boardMarkerInputSchema).min(0).max(40),
  drawings: z.array(boardDrawingInputSchema).min(0).max(80).default([]),
});

export type BoardMarkerInput = z.infer<typeof boardMarkerInputSchema>;
export type BoardDrawingInput = z.infer<typeof boardDrawingInputSchema>;
