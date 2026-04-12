import { TacticalBoard } from "@src/features/simulator/components/TacticalBoard";

export default function PitchCanvasDemoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 text-slate-100">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">PitchCanvas demo</h1>
        <p className="mt-1 max-w-prose text-sm text-slate-400">
          Validates one controlled canvas, one Pixi Application, layered world, and resize —
          not final simulator art.
        </p>
      </div>
      <TacticalBoard />
    </main>
  );
}
