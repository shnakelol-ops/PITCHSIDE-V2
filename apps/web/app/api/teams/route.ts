import { NextResponse } from "next/server";

import { prisma } from "@pitchside/data-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

function logTeamsRouteError(context: string, error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[api/teams] ${context}`);
  console.error("[api/teams] message:", err.message);
  console.error("[api/teams] stack:\n", err.stack);

  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.code === "string") {
      console.error("[api/teams] Prisma / error code:", o.code);
    }
    if (typeof o.meta === "object" && o.meta !== null) {
      console.error("[api/teams] meta:", JSON.stringify(o.meta, null, 2));
    }
    if ("clientVersion" in o) {
      console.error("[api/teams] clientVersion:", o.clientVersion);
    }
  }
}

/**
 * Returns a JSON array: [{ id, name }, ...]
 */
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(teams, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    logTeamsRouteError("GET failed — prisma.team.findMany", error);

    const message =
      error instanceof Error ? error.message : "Unknown error while loading teams.";

    return NextResponse.json(
      {
        error: {
          code: "TEAMS_LOAD_FAILED",
          message,
        },
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
