import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
}

function buttonClassName(variant: "default" | "outline", className?: string) {
  return cn(
    "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&_svg]:shrink-0",
    variant === "default" ? "border border-accent bg-accent text-surface hover:bg-accent/90" : "border border-line bg-surface text-foreground hover:border-accent/40 hover:bg-accent-soft",
    className,
  );
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}

export function ButtonLink({ className, variant = "default", ...props }: ComponentProps<typeof Link> & { variant?: "default" | "outline" }) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
