import { AppShell } from "@/components/layout/app-shell";
import { BoardV1Panel } from "@/components/matches/board-v1-panel";

const STANDALONE_SIMULATOR_MATCH_ID = "c000000000000000000000000";

export default function SimulatorPage() {
  return (
    <AppShell
      title="Simulator"
      subtitle="Standalone tactical board (no match or database dependency)."
      mainClassName="bg-gradient-to-b from-slate-100/95 via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950"
    >
      <div className="mx-auto max-w-[92rem]">
        <div className="relative rounded-[1.25rem] bg-gradient-to-br from-pitchside-600/[0.12] via-pitchside-500/[0.04] to-transparent p-[3px] shadow-[0_20px_44px_-24px_rgba(15,118,110,0.32)] ring-1 ring-pitchside-900/[0.06] dark:from-pitchside-500/[0.14] dark:via-pitchside-600/[0.06] dark:shadow-[0_26px_52px_-22px_rgba(0,0,0,0.48)] dark:ring-white/[0.06]">
          <BoardV1Panel
            matchId={STANDALONE_SIMULATOR_MATCH_ID}
            standalone
          />
        </div>
      </div>
    </AppShell>
  );
}
