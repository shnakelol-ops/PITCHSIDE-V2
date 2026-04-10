"use client";

import { cn } from "@pitchside/utils";
import { Home, LayoutDashboard, Shield, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/players", label: "Players", icon: Users },
  { href: "/matches", label: "Matches", icon: Trophy },
  { href: "/", label: "Home", icon: Home },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-950/80">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-2xl bg-gradient-to-br from-pitchside-600 to-pitchside-800 p-4 text-white shadow-panel">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-pitchside-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-base font-bold">
              P
            </span>
            Pitchside
          </div>
          <p className="mt-2 text-sm text-pitchside-100/90">
            Board, stats, and review in one coaching workspace.
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3 scrollbar-thin overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-pitchside-50 text-pitchside-900 shadow-sm dark:bg-pitchside-950/60 dark:text-pitchside-50"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
