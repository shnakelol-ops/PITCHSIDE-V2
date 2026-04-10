import {
  prisma,
  BoardObjectType,
  BoardOrientation,
  BoardSceneType,
} from "@pitchside/data-access";
import type { BoardDrawingInput } from "@pitchside/validation";
import {
  createBoardSceneSchema,
  saveBoardV1Schema,
} from "@pitchside/validation";
import { z } from "zod";

import { NextResponse } from "next/server";

import { apiError, apiSuccess, requireJson } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { DEFAULT_BOARD_MARKER_SEED } from "@/lib/board-v1-defaults";

export const dynamic = "force-dynamic";

const LEGACY_BOARD_V1_NAME = "Tactical board (V1)";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

const BOARD_V1_OBJECT_TYPES: BoardObjectType[] = [
  BoardObjectType.MARKER,
  BoardObjectType.LINE,
  BoardObjectType.ARROW,
];

const matchIdParamsSchema = z.object({
  id: z.string().cuid(),
});

type DrawMeta = { endX: number; endY: number };

function isDrawMeta(v: unknown): v is DrawMeta {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.endX === "number" &&
    typeof o.endY === "number" &&
    Number.isFinite(o.endX) &&
    Number.isFinite(o.endY)
  );
}

function isPlaybookScene(name: string, metadata: unknown): boolean {
  if (name === LEGACY_BOARD_V1_NAME) return true;
  const m = metadata as Record<string, unknown> | null;
  return m?.playbook === true || m?.boardV1 === true;
}

function nextPlaybookSceneName(scenes: { name: string }[]): string {
  let max = 0;
  const re = /^Scene (\d+)$/i;
  for (const s of scenes) {
    const m = re.exec(s.name.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = max > 0 ? max + 1 : scenes.length + 1;
  return `Scene ${n}`;
}

function serializeMarkers(
  objects: {
    id: string;
    x: number;
    y: number;
    label: string | null;
    teamSide: "HOME" | "AWAY" | "NEUTRAL" | null;
  }[],
) {
  return objects.map((o) => ({
    id: o.id,
    x: o.x,
    y: o.y,
    label: o.label && o.label.length > 0 ? o.label : "?",
    teamSide: o.teamSide ?? "NEUTRAL",
  }));
}

function serializeDrawings(
  objects: {
    id: string;
    objectType: BoardObjectType;
    x: number;
    y: number;
    metaJson: unknown;
  }[],
) {
  const out: {
    id: string;
    kind: "line" | "arrow";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }[] = [];

  for (const o of objects) {
    if (o.objectType !== BoardObjectType.LINE && o.objectType !== BoardObjectType.ARROW) {
      continue;
    }
    const root = o.metaJson;
    const meta =
      root &&
      typeof root === "object" &&
      "boardV1Draw" in (root as object) &&
      isDrawMeta((root as { boardV1Draw?: unknown }).boardV1Draw)
        ? (root as { boardV1Draw: DrawMeta }).boardV1Draw
        : isDrawMeta(root)
          ? (root as DrawMeta)
          : null;

    if (!meta) continue;

    out.push({
      id: o.id,
      kind: o.objectType === BoardObjectType.ARROW ? "arrow" : "line",
      x1: o.x,
      y1: o.y,
      x2: meta.endX,
      y2: meta.endY,
    });
  }

  return out;
}

async function getPlaybookScenes(matchId: string) {
  const formations = await prisma.boardScene.findMany({
    where: { matchId, sceneType: BoardSceneType.FORMATION },
    orderBy: { createdAt: "asc" },
  });
  return formations.filter((s) => isPlaybookScene(s.name, s.metadata));
}

async function ensurePlaybookScenes(matchId: string) {
  let scenes = await getPlaybookScenes(matchId);
  if (scenes.length > 0) return scenes;

  await prisma.$transaction(async (tx) => {
    const agg = await tx.boardScene.aggregate({
      where: { matchId },
      _max: { sortOrder: true },
    });
    const nextSort = (agg._max.sortOrder ?? 0) + 1;

    const scene = await tx.boardScene.create({
      data: {
        matchId,
        sceneType: BoardSceneType.FORMATION,
        name: "Scene 1",
        sortOrder: nextSort,
        orientation: BoardOrientation.LANDSCAPE,
        metadata: { playbook: true, boardV1: true },
      },
    });

    await tx.boardObject.createMany({
      data: DEFAULT_BOARD_MARKER_SEED.map((m) => ({
        boardSceneId: scene.id,
        objectType: BoardObjectType.MARKER,
        label: m.label,
        teamSide: m.teamSide,
        x: m.x,
        y: m.y,
      })),
    });
  });

  scenes = await getPlaybookScenes(matchId);
  return scenes;
}

function sceneSummaries(scenes: { id: string; name: string }[]) {
  return scenes.map((s) => ({ id: s.id, name: s.name }));
}

async function loadSceneBoardPayload(matchId: string, activeSceneId: string) {
  const scene = await prisma.boardScene.findFirst({
    where: { id: activeSceneId, matchId },
    include: {
      objects: {
        where: { objectType: { in: BOARD_V1_OBJECT_TYPES } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!scene) {
    throw new AppError("Board scene not found.", {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }

  if (!isPlaybookScene(scene.name, scene.metadata)) {
    throw new AppError("Board scene not found.", {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }

  const markers = scene.objects.filter((o) => o.objectType === BoardObjectType.MARKER);
  const drawObjs = scene.objects.filter(
    (o) => o.objectType === BoardObjectType.LINE || o.objectType === BoardObjectType.ARROW,
  );

  const playbook = await getPlaybookScenes(matchId);

  return {
    sceneId: scene.id,
    scenes: sceneSummaries(playbook),
    markers: serializeMarkers(markers),
    drawings: serializeDrawings(drawObjs),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const parsed = matchIdParamsSchema.safeParse(params);
    if (!parsed.success) {
      throw new AppError("Invalid match id.", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
    }

    const { id: matchId } = parsed.data;
    const sceneIdParam = new URL(request.url).searchParams.get("sceneId");

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

    const playbookScenes = await ensurePlaybookScenes(matchId);
    const summaries = sceneSummaries(playbookScenes);

    const activeId =
      sceneIdParam && playbookScenes.some((s) => s.id === sceneIdParam)
        ? sceneIdParam
        : playbookScenes[0]!.id;

    const payload = await loadSceneBoardPayload(matchId, activeId);

    return apiSuccess(payload, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

function drawingRows(sceneId: string, drawings: BoardDrawingInput[]) {
  return drawings.map((d) => ({
    boardSceneId: sceneId,
    objectType:
      d.kind === "arrow" ? BoardObjectType.ARROW : BoardObjectType.LINE,
    label: null as string | null,
    teamSide: null as "HOME" | "AWAY" | "NEUTRAL" | null,
    x: d.x1,
    y: d.y1,
    metaJson: { boardV1Draw: { endX: d.x2, endY: d.y2 } },
  }));
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const parsedParams = matchIdParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new AppError("Invalid match id.", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: parsedParams.error.flatten(),
      });
    }

    const { id: matchId } = parsedParams.data;
    const body = await requireJson(request);
    const input = saveBoardV1Schema.parse(body);

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

    const existing = await prisma.boardScene.findFirst({
      where: { id: input.sceneId, matchId },
    });

    if (!existing || !isPlaybookScene(existing.name, existing.metadata)) {
      throw new AppError("Board scene not found.", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.boardObject.deleteMany({
        where: {
          boardSceneId: input.sceneId,
          objectType: { in: BOARD_V1_OBJECT_TYPES },
        },
      });

      if (input.markers.length > 0) {
        await tx.boardObject.createMany({
          data: input.markers.map((m) => ({
            boardSceneId: input.sceneId,
            objectType: BoardObjectType.MARKER,
            label: m.label,
            teamSide: m.teamSide,
            x: m.x,
            y: m.y,
          })),
        });
      }

      if (input.drawings.length > 0) {
        await tx.boardObject.createMany({
          data: drawingRows(input.sceneId, input.drawings),
        });
      }
    });

    const payload = await loadSceneBoardPayload(matchId, input.sceneId);

    return apiSuccess(payload, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const parsedParams = matchIdParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new AppError("Invalid match id.", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details: parsedParams.error.flatten(),
      });
    }

    const { id: matchId } = parsedParams.data;
    const body = await requireJson(request);
    const input = createBoardSceneSchema.parse(body);

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

    const source = await prisma.boardScene.findFirst({
      where: { id: input.sourceSceneId, matchId },
    });

    if (!source || !isPlaybookScene(source.name, source.metadata)) {
      throw new AppError("Board scene not found.", {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    }

    const playbookBefore = await getPlaybookScenes(matchId);
    const name = nextPlaybookSceneName(playbookBefore);

    const agg = await prisma.boardScene.aggregate({
      where: { matchId },
      _max: { sortOrder: true },
    });
    const nextSort = (agg._max.sortOrder ?? 0) + 1;

    const newSceneId = await prisma.$transaction(async (tx) => {
      const scene = await tx.boardScene.create({
        data: {
          matchId,
          sceneType: BoardSceneType.FORMATION,
          name,
          sortOrder: nextSort,
          orientation: BoardOrientation.LANDSCAPE,
          metadata: { playbook: true, boardV1: true },
        },
      });

      if (input.markers.length > 0) {
        await tx.boardObject.createMany({
          data: input.markers.map((m) => ({
            boardSceneId: scene.id,
            objectType: BoardObjectType.MARKER,
            label: m.label,
            teamSide: m.teamSide,
            x: m.x,
            y: m.y,
          })),
        });
      }

      if (input.drawings.length > 0) {
        await tx.boardObject.createMany({
          data: drawingRows(scene.id, input.drawings),
        });
      }

      return scene.id;
    });

    const payload = await loadSceneBoardPayload(matchId, newSceneId);

    return NextResponse.json(
      { data: payload },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return apiError(error);
  }
}
