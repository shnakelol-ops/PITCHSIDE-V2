"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MatchEventType } from "@pitchside/validation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@pitchside/utils";

export type MatchRosterPlayer = {
  id: string;
  name: string;
};

type LoggedEventRow = {
  id: string;
  type: MatchEventType;
  note: string | null;
  timestamp: string;
  playerId: string | null;
  playerName: string | null;
};

const PANEL_EVENT_TYPES = [
  "shot_goal",
  "shot_point",
  "shot_miss",
  "turnover_won",
  "turnover_lost",
  "foul_for",
  "foul_against",
] as const satisfies readonly MatchEventType[];

type PanelEventType = (typeof PANEL_EVENT_TYPES)[number];

function countType(events: LoggedEventRow[], t: MatchEventType): number {
  return events.filter((e) => e.type === t).length;
}

type DerivedStats = {
  goals: number;
  points: number;
  shotMisses: number;
  shotAttempts: number;
  turnoversWon: number;
  turnoversLost: number;
  foulsWon: number;
  foulsConceded: number;
};

function deriveStats(events: LoggedEventRow[]): DerivedStats {
  const goals = countType(events, "shot_goal");
  const points = countType(events, "shot_point");
  const shotMisses = countType(events, "shot_miss");
  const shotAttempts = goals + points + shotMisses;

  return {
    goals,
    points,
    shotMisses,
    shotAttempts,
    turnoversWon: countType(events, "turnover_won"),
    turnoversLost: countType(events, "turnover_lost"),
    foulsWon: countType(events, "foul_for"),
    foulsConceded: countType(events, "foul_against"),
  };
}

const EVENT_BUTTONS: { type: PanelEventType; label: string }[] = [
  { type: "shot_goal", label: "GOAL" },
  { type: "shot_point", label: "POINT" },
  { type: "shot_miss", label: "SHOT MISS" },
  { type: "turnover_won", label: "TURNOVER WON" },
  { type: "turnover_lost", label: "TURNOVER LOST" },
  { type: "foul_for", label: "FOUL WON" },
  { type: "foul_against", label: "FOUL CONCEDED" },
];

const EVENT_LABELS: Record<string, string> = {
  shot_goal: "GOAL",
  shot_point: "POINT",
  shot_miss: "SHOT MISS",
  turnover_won: "TURNOVER WON",
  turnover_lost: "TURNOVER LOST",
  foul_for: "FOUL WON",
  foul_against: "FOUL CONCEDED",
  kickout_won: "KICKOUT WON",
  kickout_lost: "KICKOUT LOST",
  note: "NOTE",
};

const RECENT_COUNT = 10;

const selectClassName =
  "flex h-12 w-full rounded-[1.125rem] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-pitchside-500 focus:ring-2 focus:ring-pitchside-100 hover:border-slate-300 dark:border-slate-700 dark:from-slate-950 dark:to-slate-900 dark:text-white dark:hover:border-slate-600";

type StatsV1PanelProps = {
  matchId: string;
  teamId: string;
  players: MatchRosterPlayer[];
};

export function StatsV1Panel({ matchId, teamId: _teamId, players }: StatsV1PanelProps) {
  void _teamId;

  const [events, setEvents] = useState<LoggedEventRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<PanelEventType | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const loadEvents = useCallback(async () => {
    setLoadError(null);
    const qs = new URLSearchParams({ matchId });
    const response = await fetch(`/api/events?${qs.toString()}`, {
      cache: "no-store",
    });
    const json = (await response.json()) as
      | { data: { events: LoggedEventRow[] } }
      | { error?: { message?: string } };

    if (!response.ok) {
      const detail =
        ("error" in json && json.error?.message) || "Request failed.";
      setLoadError(
        `Couldn’t load stats. ${detail} Tap Refresh to try again.`,
      );
      setEvents(null);
      return;
    }

    if ("data" in json && json.data?.events) {
      setEvents(json.data.events);
    }
  }, [matchId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const stats = useMemo(
    () => (events ? deriveStats(events) : null),
    [events],
  );

  const recentEvents = useMemo(() => {
    if (!events) return [];
    return events.slice(0, RECENT_COUNT);
  }, [events]);

  const logEvent = async (type: PanelEventType) => {
    setPendingType(type);
    try {
      const body: {
        matchId: string;
        type: PanelEventType;
        playerId?: string;
        note?: string;
      } = { matchId, type };

      if (selectedPlayerId.trim() !== "") {
        body.playerId = selectedPlayerId.trim();
      }

      const trimmedNote = noteDraft.trim();
      if (trimmedNote !== "") {
        body.note = trimmedNote;
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        setLoadError(
          json.error?.message
            ? `Couldn’t log event. ${json.error.message}`
            : "Couldn’t log event. Check your connection and try again.",
        );
        return;
      }

      setNoteDraft("");
      setLoadError(null);
      await loadEvents();
    } finally {
      setPendingType(null);
    }
  };

  const hasRoster = players.length > 0;

  const kpiCardClass =
    "rounded-[1.125rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-white p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.75)_inset,0_10px_28px_-14px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.045] transition-shadow duration-200 dark:border-slate-700/85 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_14px_36px_-18px_rgba(0,0,0,0.48)] dark:ring-white/[0.07]";

  const kpiLabelClass =
    "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

  const kpiValueClass =
    "mt-2 font-black tabular-nums tracking-tight text-slate-950 dark:text-white";

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[1.25rem] border border-slate-200/85 bg-gradient-to-b from-white via-white to-slate-50/30 p-5 shadow-[0_14px_44px_-18px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.025] sm:p-6 dark:border-slate-800/90 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/80 dark:shadow-[0_20px_56px_-22px_rgba(0,0,0,0.52),0_0_0_1px_rgba(255,255,255,0.04)] dark:ring-white/[0.04] lg:border-l-4 lg:border-l-pitchside-500 lg:pl-6 dark:lg:border-l-pitchside-500">
      <div
        className="pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full bg-pitchside-500/[0.09] blur-3xl dark:bg-pitchside-400/[0.1]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pitchside-600 dark:text-pitchside-400">
            Live dashboard
          </p>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Event log
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Tap an event to log it.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full shrink-0 rounded-full border-slate-200/95 bg-white text-xs font-bold uppercase tracking-widest text-slate-800 shadow-sm ring-1 ring-slate-900/[0.04] transition duration-200 hover:border-pitchside-300/40 hover:bg-slate-50 hover:shadow-md hover:shadow-pitchside-900/[0.05] active:scale-[0.96] sm:w-auto sm:min-w-[8.5rem] dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:ring-white/[0.06] dark:hover:border-pitchside-500/35 dark:hover:bg-slate-800"
          onClick={() => void loadEvents()}
        >
          Refresh
        </Button>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="mt-3 rounded-[1.125rem] border border-red-200/95 bg-gradient-to-br from-red-50 to-red-50/60 px-3 py-2.5 text-sm leading-snug text-red-800 shadow-sm dark:border-red-900/55 dark:from-red-950/45 dark:to-red-950/25 dark:text-red-100"
        >
          {loadError}
        </div>
      ) : null}

      {events === null && !loadError ? (
        <div
          className="mt-5 space-y-2"
          role="status"
          aria-label="Loading stats"
        >
          <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/80" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/80" />
          </div>
        </div>
      ) : null}

      {events !== null && stats ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={kpiCardClass}>
              <p className={kpiLabelClass}>Score · G – P</p>
              <p
                className={cn(
                  kpiValueClass,
                  "mt-2.5 text-5xl leading-[0.95] tracking-tighter sm:text-[3.25rem]",
                )}
              >
                {stats.goals}
                <span className="mx-0.5 text-slate-300 dark:text-slate-600 sm:mx-1">
                  –
                </span>
                {stats.points}
              </p>
            </div>
            <div className={kpiCardClass}>
              <p className={kpiLabelClass}>Shots</p>
              <p className={cn(kpiValueClass, "text-4xl leading-none sm:text-[2.75rem]")}>
                {stats.shotAttempts}
              </p>
              <p className="mt-3 text-[11px] font-semibold tabular-nums leading-snug text-slate-600 dark:text-slate-400">
                G {stats.goals} · P {stats.points} · Miss {stats.shotMisses}
              </p>
            </div>
            <div className={kpiCardClass}>
              <p className={kpiLabelClass}>Turnovers · W / L</p>
              <p className={cn(kpiValueClass, "text-3xl leading-none")}>
                {stats.turnoversWon}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">
                  /
                </span>
                {stats.turnoversLost}
              </p>
            </div>
            <div className={kpiCardClass}>
              <p className={kpiLabelClass}>Fouls · for / against</p>
              <p className={cn(kpiValueClass, "text-3xl leading-none")}>
                {stats.foulsWon}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">
                  /
                </span>
                {stats.foulsConceded}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <Label htmlFor="stats-v2-player">Player</Label>
              {!hasRoster ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  No players added yet.
                </p>
              ) : null}
              <select
                id="stats-v2-player"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                disabled={!hasRoster}
                className={cn(
                  selectClassName,
                  "mt-1.5",
                  !hasRoster && "cursor-not-allowed opacity-60",
                )}
              >
                <option value="">No player</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="stats-v2-note">Note</Label>
              <Input
                id="stats-v2-note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Optional context for the next tap"
                className="mt-1.5 rounded-[1.125rem] border-slate-200/90 shadow-sm transition duration-200 hover:border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-[1.125rem] border border-slate-200/90 bg-gradient-to-b from-slate-100/80 to-slate-50/50 p-3 shadow-inner ring-1 ring-slate-900/[0.03] min-[420px]:grid-cols-2 dark:border-slate-700/80 dark:from-slate-900/50 dark:to-slate-950/60 dark:ring-white/[0.04]">
            {EVENT_BUTTONS.map(({ type, label }) => (
              <Button
                key={type}
                type="button"
                variant="primary"
                className={cn(
                  "min-h-[3.25rem] rounded-full text-[11px] font-bold uppercase tracking-wider shadow-[0_4px_16px_-4px_rgba(5,150,105,0.45)] transition duration-200 hover:shadow-[0_8px_28px_-6px_rgba(5,150,105,0.4)] active:scale-[0.96]",
                  pendingType === type &&
                    "pointer-events-none ring-2 ring-pitchside-200 ring-offset-2 ring-offset-slate-100 dark:ring-pitchside-500/50 dark:ring-offset-slate-950",
                  pendingType !== null &&
                    pendingType !== type &&
                    "opacity-45",
                )}
                disabled={pendingType !== null}
                onClick={() => void logEvent(type)}
              >
                {pendingType === type ? "Saving…" : label}
              </Button>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Recent · {RECENT_COUNT}
            </h3>
            <ul className="mt-2.5 divide-y divide-slate-200/90 rounded-[1.125rem] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_1px_0_0_rgba(255,255,255,0.65)_inset] ring-1 ring-slate-900/[0.03] dark:divide-slate-800 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/60 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:ring-white/[0.04]">
              {recentEvents.length === 0 ? (
                <li className="px-4 py-5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  No events logged yet.
                </li>
              ) : (
                recentEvents.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        {EVENT_LABELS[row.type] ?? row.type}
                      </p>
                      {row.playerName ? (
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                          {row.playerName}
                        </p>
                      ) : null}
                      {row.note ? (
                        <p className="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
                          {row.note}
                        </p>
                      ) : null}
                    </div>
                    <time
                      className="shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-500"
                      dateTime={row.timestamp}
                    >
                      {new Date(row.timestamp).toLocaleString()}
                    </time>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </section>
  );
}
