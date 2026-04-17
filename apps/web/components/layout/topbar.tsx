"use client";

import {
  Bell,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@pitchside/utils";

type TopbarProps = {
  title: string;
  subtitle?: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "border-b border-slate-200/70 bg-white/75 backdrop-blur-md",
        "dark:border-white/5 dark:bg-[#0B0F12]/75",
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 lg:h-[68px] lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 lg:text-lg dark:text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-600 lg:text-sm dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <label className="relative hidden items-center md:flex">
            <span className="sr-only">Search</span>
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search teams, players, matches…"
              className={cn(
                "w-48 rounded-xl py-2 pl-9 pr-3 text-sm xl:w-72 xl:pr-14",
                "border border-slate-200/80 bg-white/60 text-slate-900 shadow-sm",
                "placeholder:text-slate-400",
                "outline-none ring-pitchside-500/30 transition focus:border-pitchside-500 focus:ring-2",
                "dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500",
                "dark:ring-pitchside-400/30 dark:focus:border-pitchside-500/70",
              )}
            />
            <kbd
              className={cn(
                "pointer-events-none absolute right-2 hidden items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 shadow-sm xl:inline-flex",
                "dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
              )}
              aria-hidden
            >
              ⌘K
            </kbd>
          </label>

          <button
            type="button"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl md:hidden",
              "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm transition",
              "hover:border-slate-300 hover:bg-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/40",
              "dark:border-white/5 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-white/10",
            )}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-xl",
                  "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm transition",
                  "hover:border-slate-300 hover:bg-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/40",
                  "dark:border-white/5 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-white/10",
                )}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span
                  className={cn(
                    "absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pitchside-500",
                    "shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#0B0F12]",
                  )}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                You&rsquo;re all caught up.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/matches/new"
            className={cn(
              "hidden items-center gap-2 rounded-xl sm:inline-flex",
              "bg-pitchside-600 px-4 py-2 text-sm font-semibold text-white",
              "shadow-[0_6px_20px_-6px_rgba(5,150,105,0.55)] transition",
              "hover:bg-pitchside-700 hover:shadow-[0_10px_28px_-8px_rgba(5,150,105,0.55)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              "dark:focus-visible:ring-offset-[#0B0F12]",
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>New Match</span>
          </Link>

          <Link
            href="/matches/new"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl sm:hidden",
              "bg-pitchside-600 text-white shadow-[0_6px_20px_-6px_rgba(5,150,105,0.55)] transition",
              "hover:bg-pitchside-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              "dark:focus-visible:ring-offset-[#0B0F12]",
            )}
            aria-label="New Match"
          >
            <Plus className="h-4 w-4" />
          </Link>

          <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-white/10 md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl pl-1 pr-2 sm:pr-3",
                  "border border-slate-200/80 bg-white/70 shadow-sm transition",
                  "hover:border-slate-300 hover:bg-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitchside-500/40",
                  "dark:border-white/5 dark:bg-white/5 dark:hover:border-white/10 dark:hover:bg-white/10",
                )}
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-pitchside-600 text-xs font-semibold text-white">
                    P
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-200">
                  Coach
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-semibold">Coach</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Pitchside workspace
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
