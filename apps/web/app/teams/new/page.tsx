import { AppShell } from "@/components/layout/app-shell";

export default function NewTeamPage() {
  return (
    <AppShell
      title="New team"
      subtitle="Creation forms and validation will be wired to Prisma in a future milestone."
    >
      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
        Placeholder screen so dashboard quick actions and the top bar can link
        here without breaking the build.
      </p>
    </AppShell>
  );
}
