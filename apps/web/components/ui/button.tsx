import * as React from "react";
import { cn } from "@pitchside/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 disabled:hover:shadow-none",
          variant === "primary" &&
            "bg-pitchside-600 text-white shadow-[0_4px_16px_-4px_rgba(5,150,105,0.5)] hover:bg-pitchside-700 hover:shadow-[0_8px_28px_-6px_rgba(5,150,105,0.45)] active:scale-[0.97] dark:shadow-[0_4px_20px_-4px_rgba(5,150,105,0.4)] dark:hover:shadow-[0_10px_32px_-6px_rgba(5,150,105,0.35)]",
          variant === "secondary" &&
            "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800",
          variant === "ghost" &&
            "text-slate-700 hover:bg-slate-100 active:scale-[0.97] dark:text-slate-200 dark:hover:bg-slate-800/80",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
