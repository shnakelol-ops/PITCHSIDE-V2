import { prisma } from "@pitchside/data-access";
import { createMatchSchema } from "@pitchside/validation";
import { apiCreated, apiError, requireJson } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { matchDate: "desc" },
      select: {
        id: true,
        opponentName: true,
        competition: true,
        venue: true,
        matchDate: true,
        status: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return new Response(JSON.stringify({ data: matches }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...NO_STORE_HEADERS,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await requireJson(request);
    const input = createMatchSchema.parse(body);

    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true },
    });

    if (!team) {
      throw new AppError("Team ID not found.", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
      });
    }

    const match = await prisma.match.create({
      data: {
        teamId: input.teamId,
        opponentName: input.opponentName,
        competition: input.competition || null,
        venue: input.venue || null,
        matchDate: new Date(input.matchDate),
      },
    });

    const response = apiCreated(match);
    response.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
    return response;
  } catch (error: unknown) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2003"
    ) {
      return apiError(
        new AppError("Team ID not found.", {
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
      );
    }
    return apiError(error);
  }
}
