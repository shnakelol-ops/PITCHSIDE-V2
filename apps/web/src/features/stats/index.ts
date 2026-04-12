/** @public Stats feature surface. */

export { StatsBoardPhase1 } from "@src/features/stats/stats-board-phase1";
export { StatsBoardPhase3 } from "@src/features/stats/stats-board-phase3";
export { StatsBoardPhase4 } from "@src/features/stats/stats-board-phase4";
export type { StatsBoardPhase4Props } from "@src/features/stats/stats-board-phase4";
export { StatsBoardPhase5 } from "@src/features/stats/stats-board-phase5";
export type { StatsBoardPhase5Props } from "@src/features/stats/stats-board-phase5";
export { StatsBoardPhase6 } from "@src/features/stats/stats-board-phase6";
export type { StatsBoardPhase6Props } from "@src/features/stats/stats-board-phase6";
export { StatsBoardShell } from "@src/features/stats/board/stats-board-shell";
export { StatsPitchSurface } from "@src/features/stats/board/stats-pitch-surface";
export type { StatsPitchSurfaceProps } from "@src/features/stats/board/stats-pitch-surface";
export { getStatsEventMarkerStyle } from "@src/features/stats/board/stats-event-marker-style";
export type {
  StatsEventMarkerStyle,
  StatsMarkerStyleOptions,
} from "@src/features/stats/board/stats-event-marker-style";
export type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";
export type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
export { STATS_DEV_PLACEHOLDER_ROSTER } from "@src/features/stats/types/stats-roster";
export type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
export { STATS_REVIEW_MODES } from "@src/features/stats/types/stats-review-mode";

export { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
export type { StatsScorerStripProps } from "@src/features/stats/controls/stats-scorer-strip";
export { StatsVoiceStrip } from "@src/features/stats/controls/stats-voice-strip";
export type { StatsVoiceStripProps } from "@src/features/stats/controls/stats-voice-strip";
export type { StatsBoardShellProps } from "@src/features/stats/board/stats-board-shell";

export { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
export type { StatsArmSelection } from "@src/features/stats/hooks/use-stats-event-log";
export {
  createStatsLoggedEvent,
  type CreateStatsLoggedEventInput,
  type StatsEventSelection,
  type StatsFieldEventType,
  type StatsFieldLoggedEvent,
  type StatsLoggedEvent,
  type StatsLoggedEventBase,
  type StatsPeriodPhase,
  type StatsScoreLoggedEvent,
  type StatsScoreType,
  type StatsTeamContext,
} from "@src/features/stats/model/stats-logged-event";

export {
  assignScorerToEvents,
  findLatestScorePendingScorer,
} from "@src/features/stats/model/stats-scorer-utils";
export { assignVoiceNoteToEvents } from "@src/features/stats/model/stats-voice-utils";

export { useStatsVoiceRecorder } from "@src/features/stats/hooks/use-stats-voice-recorder";
export type { UseStatsVoiceRecorderResult } from "@src/features/stats/hooks/use-stats-voice-recorder";
