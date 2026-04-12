import { SimulatorBoardShell } from "@src/features/simulator";

/** Warm grass field — soft vertical drift, no flat grey chrome at viewport edge. */
export default function SimulatorPage() {
  return (
    <div className="min-h-[100dvh] bg-[#9FAF7A] bg-gradient-to-b from-[#aab892] via-[#9FAF7A] to-[#8f9f72] text-stone-800">
      <SimulatorBoardShell />
    </div>
  );
}
