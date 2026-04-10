import * as React from "react";
import { cn } from "@pitchside/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("mb-2 block text-sm font-medium text-slate-700", className)}
        {...props}
      />
    );
  }
);

Label.displayName = "Label";
