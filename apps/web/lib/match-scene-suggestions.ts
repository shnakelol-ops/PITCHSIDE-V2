import type { CreateMatchEventInput } from "@pitchside/validation";

export type SceneSuggestionKind = "restart" | "transition" | "review";

export type SceneSuggestion = {
  id: string;
  kind: SceneSuggestionKind;
  title: string;
  hint: string;
};

/**
 * UI-only hooks for future scene automation. Coach always chooses when to switch scenes.
 */
export function suggestSceneAfterLog(
  input: Omit<CreateMatchEventInput, "matchId">,
): SceneSuggestion | null {
  const id = `hint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const t = input.type;

  if (t === "kickout_won" || t === "kickout_lost") {
    return {
      id,
      kind: "restart",
      title: "Restart scene",
      hint: "Kickout moment — consider a saved restart / kickout setup when you’re ready.",
    };
  }

  if (t === "turnover_won" || t === "turnover_lost") {
    return {
      id,
      kind: "transition",
      title: "Transition scene",
      hint: "Possession shift — a transition layout scene may fit; switch only when you choose.",
    };
  }

  if (t === "phase_change") {
    const p = input.context?.matchPeriod;
    if (p === "HALF_TIME" || p === "FULL_TIME") {
      return {
        id,
        kind: "review",
        title: "Review scene",
        hint: "Natural break — optional debrief or review scene on the board (manual switch).",
      };
    }
  }

  return null;
}
