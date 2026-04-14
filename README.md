# Pitchside.

Pitchside is a production-oriented coaching product built from three internal modules that share match data at the centre:

- **Board** — tactical scenes, objects on the pitch, and saved board states tied to a match.
- **Stats** — structured events, timing, zones, and scoring context. Stats does not depend on Board.
- **Review** — snapshots and overlays that will later connect stats outputs back into board-style views.

The monorepo keeps those boundaries explicit while shipping one user-facing Next.js application.

## Monorepo layout

| Path | Role |
| --- | --- |
| `apps/web` | Next.js App Router UI, shell, providers, marketing and dashboard entrypoints |
| `packages/data-access` | Prisma client singleton and database access |
| `packages/domain` | Domain boundaries and future use-cases (no feature logic yet) |
| `packages/board-engine` | Board module package (scaffolding) |
| `packages/stats-engine` | Stats module package (scaffolding) |
| `packages/review-engine` | Review module package (scaffolding) |
| `packages/types` | Shared TypeScript types |
| `packages/utils` | Shared utilities (`cn`, etc.) |
| `packages/validation` | Shared Zod schemas |
| `packages/ui` | Shared UI primitives (scaffolding) |
| `prisma` | PostgreSQL schema and migrations |

## Stack

- **Workspaces:** pnpm
- **Orchestration:** Turborepo
- **App:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Data:** PostgreSQL, Prisma
- **Client state & server cache:** Zustand, TanStack Query
- **Validation:** Zod
- **Auth-ready:** NextAuth installed; implementation comes later

## Getting started

1. Install dependencies: `pnpm install`
2. Copy environment: `cp .env.example .env` on macOS/Linux, or `copy .env.example .env` in PowerShell on Windows
3. Start Postgres: `docker compose up -d postgres`
4. Generate Prisma client: `pnpm db:generate`
5. Apply migrations: `pnpm db:migrate`
6. Run the app: `pnpm dev`

`pnpm` 10 may skip dependency install scripts until you allow them. This repo lists Prisma, `@prisma/client`, `sharp`, and related packages under `pnpm.onlyBuiltDependencies` in the root `package.json` so engines download correctly after `pnpm install`.

Root `db:*` scripts delegate to `@pitchside/data-access`, which runs `pnpm -w exec prisma …` against `prisma/schema.prisma` so Prisma always executes from the workspace root (required for pnpm 10 + Prisma 6). The root `package.json` also pins `prisma` and `@prisma/client` so `prisma generate` does not try to mutate the lockfile mid-command.

Optional: run the full stack in Docker with `docker compose up` (builds `web` from `docker/web.Dockerfile` and mounts the repo into `/workspace`).

## Development principles

- Keep **Board**, **Stats**, and **Review** as separate packages; share **types**, **validation**, and **match-shaped** data through `domain` and `types`, not by importing Board from Stats.
- Prefer strict TypeScript, small public surfaces on packages, and colocating UI with `apps/web` until shared UI is genuinely reused.
- Database changes flow through Prisma migrations; do not hand-edit production databases.

## Current build order

Turborepo runs `^build` / `^lint` / `^typecheck` on dependencies first. Packages without compile output still run `tsc` for verification. The web app depends on workspace packages and must list them in `next.config.ts` `transpilePackages` so Next can bundle TypeScript sources from `packages/*`.
