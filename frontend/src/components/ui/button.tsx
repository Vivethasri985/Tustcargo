"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline";

const PRESS = { whileHover: { y: -2 }, whileTap: { scale: 0.96, y: 0 } };
const SPRING = { type: "spring", stiffness: 420, damping: 26 } as const;

function buttonClassName(variant: Variant, className?: string) {
  return cn(
    "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-center transition-[background-color,border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&_svg]:shrink-0",
    variant === "default"
      ? "btn-shine border border-stage bg-stage text-surface shadow-[0_10px_30px_-14px_var(--stage)] hover:shadow-[0_14px_34px_-12px_var(--stage)]"
      : "border border-line bg-surface/80 text-foreground backdrop-blur hover:border-stage/60 hover:bg-stage/10",
    className,
  );
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  children?: React.ReactNode;
}

export function Button({ className, variant = "default", disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      {...(disabled ? {} : PRESS)}
      transition={SPRING}
      disabled={disabled}
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  className,
  variant = "default",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <motion.span {...PRESS} transition={SPRING} className="inline-flex max-w-full">
      <Link className={buttonClassName(variant, className)} {...props} />
    </motion.span>
  );
}
