import type { ReactNode } from "react";

import { cn } from "@pitchside/utils";

type LivePanelCardProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * Shared chrome for live match sidebar cards — consistent rhythm with the board column.
 */
export function LivePanelCard({
  id,
  eyebrow,
  title,
  description,
  headerRight,
  children,
  className,
  bodyClassName,
}: LivePanelCardProps) {
  return (
    <article
      id={id}
      className={cn(
        "relative overflow-x-hidden rounded-[1.25rem] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_10px_36px_-18px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04] dark:border-slate-800/90 dark:from-slate-950 dark:to-slate-900/85 dark:shadow-[0_14px_44px_-20px_rgba(0,0,0,0.45)] dark:ring-white/[0.05]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-slate-200/75 px-5 py-4 dark:border-slate-800/80 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pitchside-600 dark:text-pitchside-400">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        {headerRight ? (
          <div className="shrink-0 sm:pt-0.5">{headerRight}</div>
        ) : null}
      </div>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </article>
  );
}
