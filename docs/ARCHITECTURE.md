# Pitchside V1 — Architecture (Single Source of Truth)

**Status:** LOCKED. All implementation must conform to this document.  
**Audience:** Engineers, code agents (Simulator, Stats, Debug), reviewers.  
**Conflict resolution:** If code disagrees with this file, **code is wrong** until this file is formally amended.

---

## 1. Product scope

Pitchside V1 is **two separate engines** plus a **shared foundation**. Nothing else is in scope for V1.

| Engine | Identity | Runtime | Purpose |
|--------|----------|---------|---------|
| **Simulator** | Premium Coaching Simulation Engine | **PixiJS** (GPU) | Tactics, movement teaching, session design, path recording & playback |
| **Stats** | Live Visual Stats Engine (pitch-first) | **PixiJS** (shared pitch stage) | Live match logging, spatial dots, review emphasis — same canvas as simulator in STATS mode |

**Forbidden globally (V1):** dashboards, spreadsheets, AI features, video systems, social, chat, prediction, complex analytics, duplicate event systems, parallel coordinate models, “helpful” features not listed in §2–3.

---

## 2. Simulator engine (mandatory behaviour)

### 2.1 Allowed features only

- Draggable **micro-athletes** (smooth movement, **no snapping**).
- Directional feel; record **movement paths**; **playback** sequences.
- Transport: **play / pause / reset**; simple **timeline-style** flow.
- **Shadow runs** (first-class): visually distinct, not cluttered — used for support runs, overlaps, decoys, recovery lines.

### 2.2 Rendering (mandatory)

- **PixiJS** only for simulator canvas.
- Layered rendering; **multiple moving objects** at smooth frame rates.

### 2.3 Simulator forbidden

- Dashboards, analytics, any non-simulation feature **except** the **STATS surface mode** on the same Pixi pitch (tap-to-log dots, voice UX owned by stats hooks — see §3).

### 2.4 Visual standard (simulator)

- Micro-athletes **evolve beyond flat circles**: gradient, shadow, directional indication; must read as **athletes**, not dots.
- Premium depth: shadows, gradients, hierarchy; **no flat white simulator chrome** around the pitch long-term.

**Code location:** `src/features/simulator/**` only for simulator domain logic, Pixi lifecycle, paths, shadow-run model, playback state.  
**Do not** import simulator internals from stats feature or vice versa.

---

## 3. Stats engine (mandatory behaviour)

### 3.1 Allowed features only

- **Tap pitch** to log event; **auto-capture location**; render **dots** on pitch.
- Scoring: **goal**, **point**, **2-point**; **scorer attribution** where the model requires it.
- Event types (non-exhaustive wording; exact enum lives in `src/types` + validation): turnover (won/lost), kickout (won/lost), free (won/conceded), wides, shots.
- **Wides = red dots** (spatially consistent with shared coordinates).
- **Voice notes:** attach to events or moments; fast, low friction — **stats feature only**, never simulator.

### 3.2 Rendering (mandatory)

- **PixiJS** on the **shared** pitch stage for stats event dots and hit layer (no second canvas, no DOM canvas for event markers).

### 3.3 Stats forbidden

- Spreadsheets, dashboards, multi-step forms, duplicated event systems.

### 3.4 Visual standard (stats)

- Same premium bar as §6: depth, texture, lighting hierarchy; instant tap feedback; clear dot semantics.

**Code location:** `src/features/stats/**` for stats domain logic, hooks, and voice/scorer UX; **Pixi drawing** for logged dots lives under `src/features/simulator/pixi/**` (shared stage) and must call into stats style helpers — no parallel stats renderer.

---

## 4. Shared foundation (non-negotiable)

### 4.1 One coordinate system

- **Single normalised (or single canonical) model** for: players, paths, shadow paths, stats events, dots.
- **Do not break** this contract across features. Any transform (resize, DPR, pitch aspect) is implemented in **one place** (`src/lib` or `src/constants` as specified in §8) and reused.

### 4.2 One stats event model

- **Exactly one** event type system for stats. No parallel tables, duplicate enums, or second “logger” in simulator.

### 4.3 Performance

- Smooth drag (simulator); **instant** tap response (stats). Avoid main-thread blocking; batch Pixi updates deliberately.

---

## 5. Layout doctrine

- The **board is the centrepiece**; coaches must **not** scroll to reach primary tools.
- Pitch is always the **primary surface**; controls **wrap** the board (coaching console, not generic app).
- Implementation lives in **screen/layout** layers (`src/app` or `src/pages`) **only** as composition — **no** core simulation or stats logic in layout files.

---

## 6. Visual & experience standard (global)

**Required direction:** layered depth, subtle texture, controlled lighting, focus vs blur hierarchy, premium surface feel.

**Apply:** shadows, gradients, soft glow on active interactions, hierarchy for active vs inactive.

**Do not:** flat white as the dominant UI; harsh flat fills without depth; childish or low-end styling for core surfaces.

**Token rule:** shared colours/spacing for **both** engines’ chrome should converge on **one** Tailwind + design-token approach in `src/styles` and `src/components/ui`; the pitch canvas uses **Pixi** only; stats dot colours **must** align with the shared semantic palette where applicable.

---

## 7. Tech stack (locked)

| Layer | Technology |
|-------|------------|
| Pitch canvas (simulator + stats) | **PixiJS** (single stage; mode toggles interaction) |
| App | **React**, **TypeScript** |
| Styling | **Tailwind** |
| UI primitives | **shadcn/ui** (`src/components/ui`) |

**Optional:** Remotion **only** if explicitly requested in a phase charter. Asset packs (pitch textures, icons) allowed when a phase names them.

**Do not** add libraries without a phase document that names them and proves necessity.

---

## 8. Repository structure (mandatory paths)

All new V1 code follows:

| Path | Responsibility |
|------|----------------|
| `src/features/simulator` | Simulator engine only |
| `src/features/stats` | Stats engine only |
| `src/components/ui` | shadcn / shared UI |
| `src/lib` | Shared utilities (coords, time, ids) — **no** feature-specific rules that belong in features |
| `src/types` | Shared TypeScript types (including stats event shapes consumed by both app and stats) |
| `src/constants` | Pitch dimensions, config constants, engine-agnostic numbers |
| `src/styles` | Global styles, Tailwind layers, tokens |
| `src/app` or `src/pages` | Routes, shells, composition only |

**Rule:** **Do not** mix simulator and stats **domain** logic across feature folders. Shared code only in `src/lib`, `src/types`, `src/constants`, `src/styles`, `src/components/ui` as appropriate.

---

## 9. Engineering rules

- No over-engineering; smallest structure that satisfies the phase.
- No duplicate systems; no hacks that bypass the coordinate or event contracts.
- Phases only: each phase has a charter (goal, files, done criteria). Implement **only** that phase.
- Breaking changes to §4 require an **explicit architecture revision** (update this file first).

---

## 10. Agent boundaries (anti-drift)

| Agent / role | May touch | Must not touch |
|--------------|-----------|----------------|
| **Simulator** | `src/features/simulator/**`, shared helpers if needed for coords only | Stats domain hooks/UI in `src/features/stats/**` except shared-stage stats overlay wiring |
| **Stats** | `src/features/stats/**`, shared types/constants for events, shared Pixi stats overlay touchpoints | Duplicate pitch canvas, Konva stats surface in product routes |
| **Debug / infra** | Tests, CI, logging hooks, non-feature config | Product semantics, event schema, coordinate contract |
| **Layout / app** | `src/app` or `src/pages`, shell composition | Engine internals |

If an agent needs a shared change, it **documents the change** and limits edits to `src/lib` / `src/types` / `src/constants` with **minimal surface**.

---

## 11. Phased delivery (mandatory process)

For every phase:

1. **Explain** what is built (mapped to §2 or §3).
2. **List** exact files to create or modify.
3. **Implement** only that list.
4. **Stop** with a short handoff (what works, what is explicitly deferred).

No phase may expand scope into forbidden areas (§1, §2.3, §3.3).

---

## 12. Definition of success

**Simulator:** smooth, premium feel; shadow runs obvious; movement clean and readable.  
**Stats:** instant logging, visual clarity, low friction; halftime insight from spatial dots + scoring model.  
**Global:** speed, clarity, visual quality, coaching usability — **not** a generic CRUD app or data warehouse UI.

---

## 13. Amendment process

Changes to this document are **architectural decisions**: version the change (date + short note at bottom of file), notify all agents, and migrate code in a dedicated phase.

---

## 14. Implementation rules (binding)

- Keep **simulator** and **stats** separate (`src/features/simulator` vs `src/features/stats`).
- Keep **rendering** (Pixi pitch) **isolated** from **UI shell** (routes, layout, chrome): shells compose feature components; they do not own engine internals.
- Create **reusable shared pitch constants** in `src/constants` (and shared coord/math in `src/lib`) **without** merging **business logic** across engines.
- Prefer **readable, modular** code over clever abstractions.
- **Do not** over-engineer.
- **Do not** add libraries without **written justification** in the phase charter (name, version, why alternatives fail).

---

## 15. Agent response format (mandatory)

When implementing any phase, the responsible agent **must** output, in order:

1. **Brief explanation** of the phase (what and why, tied to §2 / §3 / §4).
2. **List of files** to be created or updated (exact paths).
3. **The changes** (patch / implementation).
4. **Completed:** what now works or is true.
5. **Remaining:** what is explicitly deferred to the **next** phase (no scope creep).

**Veering** (extra features, cross-engine merges, undocumented deps) **violates** this document.

---

*End of Pitchside V1 Architecture — Single Source of Truth.*

**Amendment log:** 2026-04-10 — Added §14 (implementation rules) and §15 (agent response format).  
**Amendment log:** 2026-04-11 — Stats rendering locked to **shared Pixi pitch** (STATS mode); Konva stats surface deprecated for product use.
