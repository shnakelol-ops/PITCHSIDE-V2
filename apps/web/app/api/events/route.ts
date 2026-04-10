import { prisma } from "@pitchside/data-access";
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
      select: { id: true },
    });

    if (!match) {
      throw new AppError("Match not found.", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    const events = await prisma.event.findMany({
      where: { matchId },
      orderBy: { timestamp: "desc" },
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
      })),
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

    const created = await prisma.event.create({
      data: {
        matchId: input.matchId,
        type: input.type,
        playerId: input.playerId ?? null,
        note: input.note ?? null,
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
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
