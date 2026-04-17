"use client";

import {
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  Shield,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@pitchside/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/players", label: "Players", icon: Users },
  { href: "/matches", label: "Matches", icon: Trophy },
  { href: "/", label: "Home", icon: Home },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;

const STORAGE_KEY = "pitchside:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      // localStorage unavailable — keep default
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        aria-label="Primary navigation"
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col lg:flex",
          "border-r border-slate-200/70 bg-white/75 backdrop-blur-md",
          "dark:border-white/5 dark:bg-[#0B0F12]/75",
          "transition-[width] duration-200 ease-out",
          !hydrated && "duration-0",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-slate-200/70 dark:border-white/5",
            "h-16 lg:h-[68px]",
            collapsed ? "justify-center px-0" : "justify-start px-4",
          )}
        >
          <Link
            href="/"
            aria-label="Pitchside home"
            className={cn(
              "group inline-flex items-center gap-2.5 rounded-lg transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/40",
            )}
          >
            <span
              className={cn(
                "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                "bg-gradient-to-br from-pitchside-500 to-pitchside-700 text-base font-bold text-white",
                "shadow-[0_6px_20px_-6px_rgba(5,150,105,0.55)]",
              )}
            >
              P
              <span
                className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15"
                aria-hidden
              />
            </span>
            {!collapsed && (
              <span className="flex flex-col leading-none">
                <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  Pitchside
                </span>
                <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Command
                </span>
              </span>
            )}
          </Link>
        </div>

        <nav
          className={cn(
            "scrollbar-thin flex-1 overflow-y-auto",
            collapsed ? "px-2 py-3" : "px-3 py-4",
          )}
        >
          {!collapsed && (
            <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
              Workspace
            </div>
          )}

          <ul className="flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);

              const link = (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/40",
                    collapsed
                      ? "h-10 w-10 justify-center"
                      : "h-10 gap-3 px-3",
                    active
                      ? cn(
                          "bg-pitchside-50 text-pitchside-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                          "dark:bg-pitchside-500/10 dark:text-pitchside-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                        )
                      : cn(
                          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                          "dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                        ),
                  )}
                >
                  {active && !collapsed && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-2 left-0 w-[3px] rounded-r-full",
                        "bg-pitchside-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                      )}
                    />
                  )}
                  <Icon
                    aria-hidden
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-pitchside-600 dark:text-pitchside-300"
                        : cn(
                            "text-slate-500 group-hover:text-slate-900",
                            "dark:text-slate-400 dark:group-hover:text-white",
                          ),
                    )}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );

              return (
                <li key={href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={cn(
            "border-t border-slate-200/70 dark:border-white/5",
            collapsed ? "p-2" : "p-3",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-pressed={collapsed}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition",
                  "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                  "hover:border-slate-300 hover:bg-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/40",
                  "dark:border-white/5 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-white/10",
                  collapsed
                    ? "h-10 w-10 justify-center"
                    : "h-10 w-full justify-center gap-2 px-3",
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs font-medium">Collapse</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
