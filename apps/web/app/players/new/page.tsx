import { AppShell } from "@/components/layout/app-shell";

export default function NewPlayerPage() {
  return (
    <AppShell
      title="New player"
      subtitle="Player intake will reuse shared Zod schemas from `@pitchside/validation`."
    >
      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
        Empty placeholder to keep navigation and typed routes consistent.
      </p>
    </AppShell>
  );
}
