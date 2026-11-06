import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-relaxed",
        tone === "neutral" && "border-line bg-background text-muted",
        tone === "success" && "border-accent/20 bg-accent-soft text-accent",
        tone === "warning" && "border-warning/20 bg-warning-soft text-warning",
        className,
      )}
      {...props}
    />
  );
}
