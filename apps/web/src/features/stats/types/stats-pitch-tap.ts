/**
 * Phase 1 — tap capture payload. Board-normalised coordinates are the contract
 * (see `docs/ARCHITECTURE.md` §4.1); aligned with `@src/lib/pitch-coordinates`.
 */
export type StatsPitchTapPayload = {
  nx: number;
  ny: number;
  atMs: number;
  /** Stage pixel coordinates at tap time (debug / future hit-testing only). */
  stageX: number;
  stageY: number;
};
