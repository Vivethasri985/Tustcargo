import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 min-w-0 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal outline-none transition-colors placeholder:text-muted/80 hover:border-accent/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-wait disabled:opacity-60 file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-accent",
        className,
      )}
      {...props}
    />
  );
}
