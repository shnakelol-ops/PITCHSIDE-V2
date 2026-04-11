import { SportType } from "@pitchside/data-access";

import type { PitchSport } from "@/config/pitchConfig";

const STORAGE_PREFIX = "pitchside.boardPitchSport.";

export function teamSportToPitchSport(teamSport: SportType): PitchSport {
  switch (teamSport) {
    case SportType.SOCCER:
      return "soccer";
    case SportType.HURLING:
      return "hurling";
    case SportType.GAELIC_FOOTBALL:
      return "gaelic";
  }
}

/**
 * Whether a stored board pitch choice is valid for this match's team sport.
 * Blocks e.g. soccer markings on a Gaelic match after reload (stale session).
 * Gaelic ↔ hurling allowed (same family, different length markings).
 */
export function isBoardPitchAllowedForTeam(
  teamSport: SportType,
  pitch: PitchSport,
): boolean {
  if (teamSport === SportType.SOCCER) {
    return pitch === "soccer";
  }
  if (teamSport === SportType.GAELIC_FOOTBALL) {
    return pitch === "gaelic" || pitch === "hurling";
  }
  if (teamSport === SportType.HURLING) {
    return pitch === "hurling" || pitch === "gaelic";
  }
  return false;
}

/**
 * Resolve pitch to show on workspace load: team-aligned, with session only
 * when it matches the team (or GAA family). Clears invalid stored values.
 */
export function resolveHydratedBoardPitchSport(
  matchId: string,
  teamSport: SportType,
): PitchSport {
  const canonical = teamSportToPitchSport(teamSport);
  const stored = readStoredBoardPitchSport(matchId);
  if (stored && isBoardPitchAllowedForTeam(teamSport, stored)) {
    return stored;
  }
  if (stored && !isBoardPitchAllowedForTeam(teamSport, stored)) {
    persistBoardPitchSport(matchId, canonical);
  }
  return canonical;
}

export function readStoredBoardPitchSport(matchId: string): PitchSport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + matchId);
    if (raw === "soccer" || raw === "gaelic" || raw === "hurling") return raw;
  } catch {
    /* private mode / quota */
  }
  return null;
}

export function persistBoardPitchSport(matchId: string, sport: PitchSport) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + matchId, sport);
  } catch {
    /* ignore */
  }
}
