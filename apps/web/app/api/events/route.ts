import { prisma, type EventType } from "@pitchside/data-access";
import type { Prisma } from "@pitchside/data-access";
import { createMatchEventSchema } from "@pitchside/validation";
import { z } from "zod";

import { apiCreated, apiError, apiSuccess, requireJson } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const matchIdQuerySchema = z.object({
  matchId: z.string().cuid(),
});

function formatPlayerDisplayName(player: {
  firstName: string;
  lastName: string;
  nickname: string | null;
}): string {
  const nick = player.nickname?.trim();
  if (nick) return nick;
  return `${player.firstName} ${player.lastName}`.trim();
}

function parseEventContext(
  raw: Prisma.JsonValue | null | undefined,
): {
  matchPeriod?: string;
  clockLabel?: string;
  pitchZone?: string;
  pitchLane?: string;
  pitchSide?: string;
  logEventType?: string;
  logSubAction?: string;
  logNormX?: number;
  logNormY?: number;
  logDerivedZone?: string;
  logTacticalPhase?: string;
  logPlayerNumber?: number;
} | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const matchPeriod =
    typeof o.matchPeriod === "string" ? o.matchPeriod : undefined;
  const clockLabel =
    typeof o.clockLabel === "string" ? o.clockLabel : undefined;
  const pitchZone =
    typeof o.pitchZone === "string" ? o.pitchZone : undefined;
  const pitchLane =
    typeof o.pitchLane === "string" ? o.pitchLane : undefined;
  const pitchSide =
    typeof o.pitchSide === "string" ? o.pitchSide : undefined;
  const logEventType =
    typeof o.logEventType === "string" ? o.logEventType : undefined;
  const logSubAction =
    typeof o.logSubAction === "string" ? o.logSubAction : undefined;
  const logNormX =
    typeof o.logNormX === "number" && Number.isFinite(o.logNormX)
      ? o.logNormX
      : undefined;
  const logNormY =
    typeof o.logNormY === "number" && Number.isFinite(o.logNormY)
      ? o.logNormY
      : undefined;
  const logDerivedZone =
    typeof o.logDerivedZone === "string" ? o.logDerivedZone : undefined;
  const logTacticalPhase =
    typeof o.logTacticalPhase === "string" ? o.logTacticalPhase : undefined;
  const logPlayerNumber =
    typeof o.logPlayerNumber === "number" &&
    Number.isFinite(o.logPlayerNumber)
      ? o.logPlayerNumber
      : undefined;
  if (
    matchPeriod === undefined &&
    clockLabel === undefined &&
    pitchZone === undefined &&
    pitchLane === undefined &&
    pitchSide === undefined &&
    logEventType === undefined &&
    logSubAction === undefined &&
    logNormX === undefined &&
    logNormY === undefined &&
    logDerivedZone === undefined &&
    logTacticalPhase === undefined &&
    logPlayerNumber === undefined
  ) {
    return null;
  }
  return {
    matchPeriod,
    clockLabel,
    pitchZone,
    pitchLane,
    pitchSide,
    logEventType,
    logSubAction,
    logNormX,
    logNormY,
    logDerivedZone,
    logTacticalPhase,
    logPlayerNumber,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = matchIdQuerySchema.safeParse({
      matchId: searchParams.get("matchId") ?? "",
    });

    if (!parsed.success) {
      throw new AppError("Invalid or missing matchId query parameter.", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
    }

    const { matchId } = parsed.data;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, currentPeriod: true },
    });

    if (!match) {
      throw new AppError("Match not found.", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    const events = await prisma.event.findMany({
      where: { matchId },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
      },
    });

    return apiSuccess({
      events: events.map((row) => ({
        id: row.id,
        type: row.type,
        note: row.note,
        timestamp: row.timestamp.toISOString(),
        playerId: row.playerId,
        playerName: row.player
          ? formatPlayerDisplayName(row.player)
          : null,
        context: parseEventContext(row.context),
      })),
      currentPeriod: match.currentPeriod,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await requireJson(request);
    const input = createMatchEventSchema.parse(body);

    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
      select: { id: true, teamId: true },
    });

    if (!match) {
      throw new AppError("Match not found.", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    if (input.playerId) {
      const player = await prisma.player.findFirst({
        where: { id: input.playerId, teamId: match.teamId },
        select: { id: true },
      });
      if (!player) {
        throw new AppError(
          "Player is not on the team for this match.",
          {
            statusCode: 400,
            code: "VALIDATION_ERROR",
          },
        );
      }
    }

    const contextJson: Prisma.InputJsonValue | undefined =
      input.context !== undefined
        ? (input.context as Prisma.InputJsonValue)
        : undefined;

    const created = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          matchId: input.matchId,
          type: input.type as EventType,
          playerId: input.playerId ?? null,
          note: input.note ?? null,
          context: contextJson ?? undefined,
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
        },
      });

      if (input.type === "phase_change" && input.context?.matchPeriod) {
        await tx.match.update({
          where: { id: input.matchId },
          data: { currentPeriod: input.context.matchPeriod },
        });
      }

      return event;
    });

    return apiCreated({
      event: {
        id: created.id,
        type: created.type,
        note: created.note,
        timestamp: created.timestamp.toISOString(),
        playerId: created.playerId,
        playerName: created.player
          ? formatPlayerDisplayName(created.player)
          : null,
        context: parseEventContext(created.context),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
