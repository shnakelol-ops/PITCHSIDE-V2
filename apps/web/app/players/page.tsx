import { AppShell } from "@/components/layout/app-shell";

export default function PlayersPage() {
  return (
    <AppShell
      title="Players"
      subtitle="Roster management will connect to the `Player` model when features land."
    >
      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
        Scaffold route only: no list, edit, or delete logic yet.
      </p>
    </AppShell>
  );
}
