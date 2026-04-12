"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SportType } from "@pitchside/data-access";
import type { CreateMatchEventInput, MatchEventType } from "@pitchside/validation";

import { useMatchWorkspaceLive } from "@/components/matches/match-workspace-live-context";
import { LivePanelCard } from "@/components/matches/live-panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoggedEventRow } from "@/lib/match-events";
import {
  deriveLiveStats,
  usesGaelicScoring,
} from "@/lib/match-live-stats";
import { formatMatchPeriodLabel } from "@/lib/match-period-labels";
import { buildMatchEventLogContext } from "@/lib/match-event-pipeline";
import { formatPitchLocationLabel } from "@/lib/pitch-location";
import { cn } from "@pitchside/utils";

export type { MatchWorkspaceRosterPlayer as MatchRosterPlayer } from "@/components/matches/match-workspace-live-context";

export type { LoggedEventRow } from "@/lib/match-events";

const EVENT_LABELS: Record<string, string> = {
  shot_goal: "GOAL",
  shot_point: "POINT",
  shot_two_pointer: "2 POINTER",
  shot_miss: "SHOT MISS",
  unforced_error: "UNFORCED ERROR",
  turnover_won: "TURNOVER WON",
  turnover_lost: "TURNOVER LOST",
  unforced_turnover: "UNFORCED TURNOVER",
  foul_for: "FOUL WON",
  foul_against: "FOUL CONCEDED",
  kickout_won: "KICKOUT WON",
  kickout_lost: "KICKOUT LOST",
  note: "NOTE",
  phase_change: "PHASE",
};

type ActionCluster = {
  label: string;
  actions: { type: MatchEventType; label: string }[];
};

function buildActionClusters(sport: SportType): ActionCluster[] {
  const scoring: ActionCluster["actions"] =
    sport === SportType.SOCCER
      ? [
          { type: "shot_goal", label: "Goal" },
          { type: "shot_miss", label: "Shot miss" },
        ]
      : usesGaelicScoring(sport)
        ? [
            { type: "shot_goal", label: "Goal" },
            { type: "shot_point", label: "Point" },
            { type: "shot_miss", label: "Shot miss" },
          ]
        : [
            { type: "shot_goal", label: "Goal" },
            { type: "shot_point", label: "Point" },
            { type: "shot_two_pointer", label: "2 Pointer" },
            { type: "shot_miss", label: "Shot miss" },
          ];

  return [
    { label: "Scoring", actions: scoring },
    {
      label: "Restarts",
      actions: [
        { type: "kickout_won", label: "Kickout won" },
        { type: "kickout_lost", label: "Kickout lost" },
      ],
    },
    {
      label: "Possession",
      actions: [
        { type: "turnover_won", label: "Turnover won" },
        { type: "turnover_lost", label: "Turnover lost" },
        { type: "unforced_turnover", label: "Unforced turnover" },
      ],
    },
    {
      label: "Discipline",
      actions: [
        { type: "foul_for", label: "Foul won" },
        { type: "foul_against", label: "Foul conceded" },
        { type: "unforced_error", label: "Unforced error" },
      ],
    },
  ];
}

type TimelineFilter =
  | "all"
  | "scores"
  | "kickouts"
  | "turnovers"
  | "discipline"
  | "phases";

const TIMELINE_TABS: { id: TimelineFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scores", label: "Scores" },
  { id: "kickouts", label: "Kickouts" },
  { id: "turnovers", label: "Turnovers" },
  { id: "discipline", label: "Discipline" },
  { id: "phases", label: "Phases" },
];

const FILTER_TYPES: Record<TimelineFilter, Set<string> | null> = {
  all: null,
  scores: new Set([
    "shot_goal",
    "shot_point",
    "shot_two_pointer",
    "shot_miss",
  ]),
  kickouts: new Set(["kickout_won", "kickout_lost"]),
  turnovers: new Set([
    "turnover_won",
    "turnover_lost",
    "unforced_turnover",
  ]),
  discipline: new Set(["foul_for", "foul_against", "unforced_error"]),
  phases: new Set(["phase_change"]),
};

function filterTimeline(
  events: LoggedEventRow[],
  filter: TimelineFilter,
): LoggedEventRow[] {
  const allow = FILTER_TYPES[filter];
  if (!allow) return events;
  return events.filter((e) => allow.has(e.type));
}

const TIMELINE_SCROLL_STYLE: CSSProperties = {
  maxHeight: "min(52vh, 32rem)",
};

function TimelineScrollRegion({
  children,
  events,
  timelineFilter,
  filteredCount,
  style,
}: {
  children: ReactNode;
  events: LoggedEventRow[];
  timelineFilter: TimelineFilter;
  filteredCount: number;
  style: CSSProperties;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const prevFilterRef = useRef<TimelineFilter | null>(null);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) scrollPosRef.current = el.scrollTop;
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const filterChanged = prevFilterRef.current !== timelineFilter;
    prevFilterRef.current = timelineFilter;

    if (filterChanged) {
      scrollPosRef.current = 0;
      el.scrollTop = 0;
      return;
    }

    el.scrollTop = scrollPosRef.current;
  }, [events, timelineFilter, filteredCount]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="-mx-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 [scrollbar-gutter:stable] dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/70"
      style={style}
      role="region"
      aria-label="Filtered event timeline"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const selectClassName =
  "flex h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-pitchside-500 focus:ring-2 focus:ring-pitchside-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600";

function KpiCell({
  label,
  value,
  hint,
  large,
}: {
  label: string;
  value: string | number;
  hint?: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.03] dark:border-slate-700/80 dark:bg-slate-900/60 dark:ring-white/[0.04]">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-black tabular-nums tracking-tight text-slate-950 dark:text-white",
          large ? "text-2xl sm:text-[1.65rem] leading-none" : "text-xl leading-none",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[10px] font-medium leading-snug text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function LiveMatchDashboard() {
  const {
    teamSport,
    players,
    events,
    loadError,
    isRefreshing,
    phaseWritePending,
    postMatchEvent,
    getClockLabel,
    setLoadError,
    scrollToPhaseControl,
    handleRefresh,
    pendingBoardLogContext,
    clearPendingBoardLogContext,
  } = useMatchWorkspaceLive();

  const actionClusters = useMemo(
    () => buildActionClusters(teamSport),
    [teamSport],
  );

  const [pending, setPending] = useState<MatchEventType | "note" | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [timelineFilter, setTimelineFilter] =
    useState<TimelineFilter>("all");

  const stats = useMemo(
    () => (events ? deriveLiveStats(events, teamSport) : null),
    [events, teamSport],
  );

  const gaelic = usesGaelicScoring(teamSport);

  const filteredTimeline = useMemo(() => {
    if (!events) return [];
    return filterTimeline(events, timelineFilter);
  }, [events, timelineFilter]);

  /**
   * Single live-event entrypoint: `postMatchEvent` then clear board-armed context
   * so the next log needs a fresh pitch tap.
   */
  const runPost = useCallback(
    async (input: Omit<CreateMatchEventInput, "matchId">) => {
      await postMatchEvent(input);
      clearPendingBoardLogContext();
    },
    [postMatchEvent, clearPendingBoardLogContext],
  );

  const logAction = async (type: MatchEventType) => {
    setPending(type);
    setLoadError(null);
    try {
      const payload: Omit<CreateMatchEventInput, "matchId"> = {
        type,
        context: buildMatchEventLogContext({
          clockLabel: getClockLabel(),
          pendingBoardLogContext,
        }),
      };
      const fromBoard = pendingBoardLogContext?.playerId;
      if (fromBoard && fromBoard.length > 0) {
        payload.playerId = fromBoard;
      }
      const trimmedNote = noteDraft.trim();
      if (trimmedNote !== "") {
        payload.note = trimmedNote;
      }
      await runPost(payload);
      setNoteDraft("");
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Couldn’t log event. Check your connection and try again.",
      );
    } finally {
      setPending(null);
    }
  };

  const logNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      setLoadError("Add note text before logging.");
      return;
    }
    setPending("note");
    setLoadError(null);
    try {
      await runPost({
        type: "note",
        note: trimmed,
        context: buildMatchEventLogContext({
          clockLabel: getClockLabel(),
          pendingBoardLogContext,
        }),
      });
      setNoteDraft("");
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Couldn’t log note. Try again.",
      );
    } finally {
      setPending(null);
    }
  };

  const busy = pending !== null;
  /** Block concurrent POSTs while a phase change is persisting (shared pipeline). */
  const pipelineBusy = busy || phaseWritePending;

  const scoreHint =
    stats && gaelic
      ? stats.twoPointers > 0
        ? `Tally ${stats.scoreTotal} pts (3 per goal, 1 per point). ${stats.twoPointers} legacy “2 pointer” tag(s) still appear in the log but are excluded from this tally.`
        : `Tally ${stats.scoreTotal} pts (3 per goal, 1 per point).`
      : stats
        ? `Total ${stats.scoreTotal} pts (3×goal + point + 2×2-pointer).`
        : undefined;

  return (
    <>
      {loadError ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-red-200/95 bg-red-50/95 px-3 py-2.5 text-sm leading-snug text-red-800 dark:border-red-900/55 dark:bg-red-950/40 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 flex-1">{loadError}</p>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void handleRefresh()}
            className="shrink-0 rounded-lg border border-red-300/80 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-900 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-900/40"
          >
            {isRefreshing ? "Syncing…" : "Sync"}
          </button>
        </div>
      ) : null}

      {events === null && !loadError ? (
        <div className="space-y-3" role="status" aria-label="Loading live dashboard">
          <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/80"
              />
            ))}
          </div>
        </div>
      ) : null}

      {events !== null && stats ? (
        <>
          <LivePanelCard
            eyebrow="Live match"
            title="KPI summary"
            description="Full match counts from the event log. Timeline filters do not change these numbers."
            headerRight={
              <button
                type="button"
                disabled={isRefreshing}
                onClick={() => void handleRefresh()}
                className="rounded-lg border border-transparent px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/80 dark:hover:text-pitchside-300"
              >
                {isRefreshing ? "Syncing…" : "Sync"}
              </button>
            }
            bodyClassName="!pt-3"
          >
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <KpiCell
                  label="Score · goals – points"
                  value={`${stats.goals} – ${stats.points}`}
                  hint={scoreHint}
                  large
                />
              </div>
              <KpiCell label="Shots (total)" value={stats.shotsTotal} />
              <KpiCell label="Shot misses" value={stats.shotMisses} />
              {!gaelic || stats.twoPointers > 0 ? (
                <KpiCell label="2-pointers" value={stats.twoPointers} />
              ) : null}
              <KpiCell label="Unforced errors" value={stats.unforcedErrors} />
              <KpiCell
                label="Kickouts · W / L"
                value={`${stats.kickoutsWon} / ${stats.kickoutsLost}`}
              />
              <KpiCell
                label="Turnovers · W / L"
                value={`${stats.turnoversWon} / ${stats.turnoversLost}`}
              />
              <KpiCell
                label="Unforced TO"
                value={stats.unforcedTurnovers}
              />
              <div
                className={cn(
                  gaelic && stats.twoPointers === 0 && "col-span-2",
                )}
              >
                <KpiCell
                  label="Fouls · for / ag"
                  value={`${stats.foulsWon} / ${stats.foulsConceded}`}
                />
              </div>
            </div>
          </LivePanelCard>

          <LivePanelCard
            eyebrow="Tagging"
            title="Event actions"
            description="Select tool on the board → tap the pitch to set zone, lane, side, and nearest player (within range). Then tap an event here. Optional note still attaches to the next log."
            bodyClassName="!pt-3"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="live-dash-note">Note</Label>
                <Input
                  id="live-dash-note"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Optional — attaches to next tap"
                  className="mt-1.5 rounded-xl border-slate-200/90 text-sm shadow-sm dark:border-slate-700"
                />
              </div>

              <div className="space-y-5">
                {actionClusters.map((cluster) => (
                  <div key={cluster.label}>
                    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {cluster.label}
                    </p>
                    <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                      {cluster.actions.map(({ type, label }) => (
                        <Button
                          key={type}
                          type="button"
                          variant="primary"
                          className={cn(
                            "min-h-[2.85rem] justify-center rounded-xl text-[11px] font-bold uppercase tracking-wide shadow-[0_4px_14px_-4px_rgba(5,150,105,0.42)]",
                            pending === type &&
                              "pointer-events-none ring-2 ring-pitchside-200 ring-offset-2 ring-offset-white dark:ring-pitchside-500/45 dark:ring-offset-slate-950",
                            pipelineBusy && pending !== type && "opacity-40",
                          )}
                          disabled={pipelineBusy}
                          onClick={() => void logAction(type)}
                        >
                          {pending === type ? "Saving…" : label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Match
                  </p>
                  <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        "min-h-[2.85rem] rounded-xl text-[11px] font-bold uppercase tracking-wide",
                        pipelineBusy && "opacity-40",
                      )}
                      disabled={pipelineBusy}
                      onClick={() => void logNote()}
                    >
                      {pending === "note" ? "Saving…" : "Log note"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        "min-h-[2.85rem] rounded-xl text-[11px] font-bold uppercase tracking-wide",
                        pipelineBusy && "opacity-40",
                      )}
                      disabled={pipelineBusy}
                      onClick={() => scrollToPhaseControl()}
                    >
                      Phase chips
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </LivePanelCard>

          <LivePanelCard
            eyebrow="Narrative"
            title="Event timeline"
            description="Newest first. Filters only change this list — KPIs stay match-wide."
            bodyClassName="!pb-4 !pt-3"
          >
            <div className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TIMELINE_TABS.map((tab) => {
                const active = timelineFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTimelineFilter(tab.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition",
                      active
                        ? "border-pitchside-500 bg-pitchside-50 text-pitchside-900 dark:border-pitchside-500 dark:bg-pitchside-950/50 dark:text-pitchside-100"
                        : "border-slate-200/90 bg-white text-slate-600 hover:border-pitchside-300/50 hover:text-pitchside-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-pitchside-600/50",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <p className="mb-2 text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
              Showing {filteredTimeline.length} of {events.length} in this view
              · scroll for full history
            </p>

            <TimelineScrollRegion
              events={events}
              timelineFilter={timelineFilter}
              filteredCount={filteredTimeline.length}
              style={TIMELINE_SCROLL_STYLE}
            >
              <ul className="divide-y divide-slate-200/90 dark:divide-slate-800">
                {filteredTimeline.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400">
                    No events in this view.
                  </li>
                ) : (
                  filteredTimeline.map((row) => {
                    const isPhase = row.type === "phase_change";
                    const phaseLabel = row.context?.matchPeriod
                      ? formatMatchPeriodLabel(row.context.matchPeriod)
                      : null;
                    const clock = row.context?.clockLabel?.trim() || null;
                    const pitchLoc = formatPitchLocationLabel(
                      row.context?.pitchZone,
                      row.context?.pitchLane,
                      row.context?.pitchSide,
                    );

                    return (
                      <li
                        key={row.id}
                        className={cn(
                          "grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,auto)] sm:items-start",
                          isPhase
                            ? "border-l-[3px] border-l-pitchside-500/80 bg-pitchside-50/50 dark:border-l-pitchside-400 dark:bg-pitchside-950/30"
                            : "bg-white/50 dark:bg-transparent",
                        )}
                      >
                        <div className="min-w-0 space-y-1.5">
                          {isPhase ? (
                            <>
                              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-pitchside-700 dark:text-pitchside-400">
                                Phase
                              </p>
                              <p className="text-sm font-semibold leading-snug text-slate-900 break-words dark:text-slate-100">
                                {phaseLabel ?? "Phase update"}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-bold leading-snug tracking-tight text-slate-900 break-words dark:text-slate-50">
                              {EVENT_LABELS[row.type] ?? row.type}
                            </p>
                          )}
                          {row.context?.logEventType ? (
                            <p className="text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
                              Quick · {row.context.logEventType}
                              {row.context.logSubAction
                                ? ` · ${row.context.logSubAction.replace(/_/g, " ")}`
                                : ""}
                              {row.context.logDerivedZone
                                ? ` · ${row.context.logDerivedZone.replace(/_/g, " ")}`
                                : ""}
                              {row.context.logTacticalPhase
                                ? ` · ${row.context.logTacticalPhase.replace(/_/g, " ")}`
                                : ""}
                              {row.context.logNormX != null &&
                              row.context.logNormY != null
                                ? ` · (${row.context.logNormX.toFixed(2)}, ${row.context.logNormY.toFixed(2)})`
                                : ""}
                            </p>
                          ) : null}
                          {row.playerName ? (
                            <p className="text-sm leading-relaxed text-slate-700 break-words dark:text-slate-300">
                              {row.playerName}
                            </p>
                          ) : null}
                          {row.note ? (
                            <p className="text-sm leading-relaxed text-slate-600 break-words dark:text-slate-400">
                              {row.note}
                            </p>
                          ) : null}
                          {pitchLoc ? (
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-400">
                              Board · {pitchLoc}
                            </p>
                          ) : null}
                          {clock ? (
                            <p className="font-mono text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                              Clock {clock}
                            </p>
                          ) : null}
                        </div>
                        <time
                          className="min-w-0 break-words text-[11px] font-semibold leading-snug text-slate-600 sm:max-w-[12rem] sm:justify-self-end sm:text-right sm:tabular-nums dark:text-slate-400"
                          dateTime={row.timestamp}
                        >
                          {new Date(row.timestamp).toLocaleString()}
                        </time>
                      </li>
                    );
                  })
                )}
              </ul>
            </TimelineScrollRegion>
          </LivePanelCard>
        </>
      ) : null}
    </>
  );
}
