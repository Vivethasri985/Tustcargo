"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types";

export interface SceneProps {
  deal: Deal;
  busy: boolean;
  pendingCapture: "deposit" | "balance" | null;
  approve: (party: "buyer" | "seller") => void;
  pay: (kind: "deposit" | "balance") => void;
  post: (path: string, body?: BodyInit) => void;
}

/** A rubber stamp that lands on the page. */
export function Stamp({ children, color, className }: { children: ReactNode; color: string; className?: string }) {
  return (
    <motion.span
      initial={{ scale: 2.2, opacity: 0, rotate: -24 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={{ type: "spring", stiffness: 320, damping: 16 }}
      className={cn(
        "inline-flex flex-col items-center rounded-md border-[3px] border-double px-3 py-1 font-display text-sm font-bold leading-tight",
        className,
      )}
      style={{ color, borderColor: color }}
    >
      {children}
    </motion.span>
  );
}

/** Decorative barcode drawn from a reference, for waybills and invoices. */
export function Barcode({ value, className }: { value: string; className?: string }) {
  const bars = Array.from(value.replace(/[^A-Z0-9]/gi, "") || "TC").flatMap((char, index) => {
    const code = char.charCodeAt(0) + index * 7;
    return [1 + (code % 3), 1 + ((code >> 2) % 2), 1 + ((code >> 3) % 3)];
  });
  let x = 0;
  return (
    <svg viewBox={`0 0 ${bars.reduce((sum, width) => sum + width + 1, 0)} 20`} className={cn("h-9 w-40", className)} aria-hidden preserveAspectRatio="none">
      {bars.map((width, index) => {
        const rect = index % 2 === 0 ? <rect key={index} x={x} y="0" width={width} height="20" fill="currentColor" /> : null;
        x += width + 1;
        return rect;
      })}
    </svg>
  );
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Fact({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-line py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium tabular-nums" style={accent ? { color: accent } : undefined}>{value}</dd>
    </div>
  );
}
