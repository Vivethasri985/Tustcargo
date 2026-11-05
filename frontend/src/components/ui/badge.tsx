import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border border-foreground/20 px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}
