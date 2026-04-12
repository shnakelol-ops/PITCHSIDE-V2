import { SoccerPitchTactics } from "@/components/board/soccer-pitch-tactics";

export default function SoccerTacticsDemoPage() {
  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <SoccerPitchTactics
        className="mx-auto max-w-3xl"
        formationLabel="Demo formation (15)"
        sportLabel="Soccer tactics"
      />
    </div>
  );
}
