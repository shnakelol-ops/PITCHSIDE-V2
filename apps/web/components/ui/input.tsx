import * as React from "react";
import { cn } from "@pitchside/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pitchside-500 focus:ring-2 focus:ring-pitchside-100",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
