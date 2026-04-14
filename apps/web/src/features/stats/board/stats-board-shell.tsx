"use client";

import type { ReactNode } from "react";

import { cn } from "@pitchside/utils";

export type StatsBoardShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Board-centred chrome: pitch fills the frame; no tool scrolling inside this shell.
 */
export function StatsBoardShell({ children, className }: StatsBoardShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-emerald-950/25 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-[3px] shadow-[0_24px_48px_-28px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]",
        className,
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.05rem] bg-gradient-to-b from-slate-900/95 to-slate-950">
        {children}
      </div>
    </div>
  );
}
