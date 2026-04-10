import { AppShell } from "@/components/layout/app-shell";

export default function TeamsPage() {
  return (
    <AppShell
      title="Teams"
      subtitle="Team directory and settings will live here in a later iteration."
    >
      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
        This route is scaffolded for navigation and typed routes. CRUD flows are
        intentionally not implemented in the foundation pass.
      </p>
    </AppShell>
  );
}
