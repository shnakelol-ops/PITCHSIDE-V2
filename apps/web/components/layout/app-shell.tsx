import type { ReactNode } from "react";

import { cn } from "@pitchside/utils";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional class on <main> for route-specific atmosphere (e.g. match workspace). */
  mainClassName?: string;
};

export function AppShell({
  title,
  subtitle,
  children,
  mainClassName,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main
          className={cn(
            "flex-1 px-4 py-6 lg:px-8 lg:py-8",
            mainClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
