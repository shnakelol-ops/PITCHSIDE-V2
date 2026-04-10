"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@pitchside/utils";

type TeamOption = { id: string; name: string };

type CreateMatchResponse = {
  data: {
    id: string;
    opponentName: string;
  };
};

type TeamsErrorBody = {
  error?: { message?: string };
};

const selectClassName = cn(
  "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition",
  "focus:border-pitchside-500 focus:ring-2 focus:ring-pitchside-100",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-pitchside-900/40",
  "dark:disabled:bg-slate-800/80",
);

export default function NewMatchPage() {
  const router = useRouter();

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [teamId, setTeamId] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [competition, setCompetition] = useState("");
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const res = await fetch("/api/teams", { cache: "no-store" });
      const raw = await res.text();
      let parsed: unknown = null;
      if (raw.length > 0) {
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          setTeamsError("Could not read teams list from the server.");
          setTeams([]);
          return;
        }
      }
      if (!res.ok) {
        const body = parsed as TeamsErrorBody | null;
        const msg = body?.error?.message?.trim();
        setTeamsError(
          msg && msg.length > 0 ? msg : `Could not load teams (HTTP ${res.status}).`,
        );
        setTeams([]);
        return;
      }
      if (!Array.isArray(parsed)) {
        setTeamsError("Invalid teams response from server (expected a JSON array).");
        setTeams([]);
        return;
      }
      const list = parsed as TeamOption[];
      setTeams(
        list.filter(
          (t): t is TeamOption =>
            t !== null &&
            typeof t === "object" &&
            typeof t.id === "string" &&
            typeof t.name === "string",
        ),
      );
    } catch (e) {
      const hint =
        e instanceof TypeError && e.message.includes("fetch")
          ? "Network error."
          : e instanceof Error
            ? e.message
            : "Unknown error";
      setTeamsError(`Could not load teams: ${hint}`);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const canSubmit =
    !teamsLoading &&
    teams.length > 0 &&
    teamId.length > 0 &&
    !submitting;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          opponentName,
          competition,
          venue,
          matchDate,
        }),
      });

      const raw = await response.text();
      let result: unknown = null;
      if (raw.length > 0) {
        try {
          result = JSON.parse(raw) as unknown;
        } catch {
          setError(
            `The server returned an unreadable response (HTTP ${response.status}). Try again or check the server logs.`,
          );
          return;
        }
      }

      if (!response.ok) {
        const err = result as { error?: { message?: string } } | null;
        const apiMsg = err?.error?.message?.trim();
        setError(
          apiMsg && apiMsg.length > 0
            ? apiMsg
            : `Could not create match (HTTP ${response.status}).`,
        );
        return;
      }

      const ok = result as CreateMatchResponse;
      if (!ok?.data?.id) {
        setError(
          "Match was created but the response was missing an id. Check the server and try reloading matches.",
        );
        return;
      }
      router.push(`/matches/${ok.data.id}`);
    } catch (e) {
      const hint =
        e instanceof TypeError && e.message.includes("fetch")
          ? "Network error—check your connection."
          : e instanceof Error
            ? e.message
            : "Unknown error";
      setError(`Could not create match: ${hint}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="New Match"
      subtitle="Create the match container that board, stats, and review will share."
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-panel dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Match Details
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Choose your team, then add opponent and schedule. The correct team
            ID is set automatically.
          </p>

          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="teamId">Team</Label>
              {teamsLoading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Loading teams…
                </p>
              ) : teamsError ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {teamsError}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-sm"
                    onClick={() => void loadTeams()}
                  >
                    Retry
                  </Button>
                </div>
              ) : teams.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">Create Team First</p>
                  <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                    You need at least one team before creating a match.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => router.push("/teams/new")}
                  >
                    Go to New Team
                  </Button>
                </div>
              ) : (
                <select
                  id="teamId"
                  name="teamId"
                  className={cn(selectClassName, "mt-2")}
                  value={teamId}
                  required
                  disabled={submitting}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">Select a team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Label htmlFor="opponentName">Opponent Name</Label>
              <Input
                id="opponentName"
                className="mt-2"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="e.g. Ballymore"
                required
                disabled={submitting || teamsLoading || teams.length === 0}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="competition">Competition</Label>
                <Input
                  id="competition"
                  className="mt-2"
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="League, Championship..."
                  disabled={submitting || teamsLoading || teams.length === 0}
                />
              </div>

              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  className="mt-2"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Home, Away, Neutral..."
                  disabled={submitting || teamsLoading || teams.length === 0}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="matchDate">Match Date</Label>
              <Input
                id="matchDate"
                className="mt-2"
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
                disabled={submitting || teamsLoading || teams.length === 0}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? "Creating Match..." : "Create Match"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/matches")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
