import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-foreground/20 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
        className,
      )}
      {...props}
    />
  );
}
