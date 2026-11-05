import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50",
        variant === "default"
          ? "bg-foreground text-background"
          : "border border-foreground/25 bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
