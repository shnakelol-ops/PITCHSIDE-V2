"use client";

import { MatchMode } from "@/components/match/MatchMode";
import { LiveMatchDashboard } from "@/components/matches/live-match-dashboard";
import { LivePanelCard } from "@/components/matches/live-panel-card";
import { useMatchWorkspaceLive } from "@/components/matches/match-workspace-live-context";

export function MatchLiveSidebar() {
  const ctx = useMatchWorkspaceLive();

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <LivePanelCard
        id="match-phase-control"
        eyebrow="Live match"
        title="Match control"
        description="Set phase and run the clock. Phase taps write to the same event log as tags."
        bodyClassName="!pt-3"
      >
        <MatchMode
          embedded
          value={ctx.period}
          onChange={ctx.handleModeChange}
          onClockChange={ctx.handleClockChange}
          disablePhaseSelection={ctx.phaseWritePending}
        />
      </LivePanelCard>

      <LiveMatchDashboard />
    </div>
  );
}
