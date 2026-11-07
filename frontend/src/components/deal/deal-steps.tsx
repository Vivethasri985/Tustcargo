"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { STAGES, stageIndex } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { DealStatus } from "@/types";

export function DealSteps({ status, delivered }: { status: DealStatus; delivered?: boolean }) {
  const active = stageIndex({ status, delivered: delivered ?? true });
  const progress = Math.min(active, STAGES.length - 1) / (STAGES.length - 1);

  return (
    <div className="relative my-8 rounded-2xl border border-line bg-surface/80 px-3 py-6 backdrop-blur sm:px-6">
      <div className="absolute inset-x-[calc(6.25%+1rem)] top-[2.6rem] hidden h-1 rounded-full bg-line sm:block" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orchid via-paypal to-mint"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol aria-label="Deal progress" className="relative grid grid-cols-4 gap-y-5 sm:grid-cols-8">
        {STAGES.map((stage, index) => {
          const done = index < active;
          const current = index === active;
          const Icon = STAGE_ICONS[stage.key];
          return (
            <li
              key={stage.key}
              aria-current={current ? "step" : undefined}
              className={cn(
                "grid justify-items-center gap-2 text-center text-[11px] font-medium",
                current ? "text-foreground" : "text-muted",
              )}
            >
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={current ? { scale: [1, 1.08, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={
                  current
                    ? { scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }
                    : { duration: 0.3, delay: index * 0.04 }
                }
                className="relative flex size-9 items-center justify-center rounded-full border text-xs"
                style={{
                  borderColor: done || current ? stage.color : "var(--line)",
                  background: current ? stage.color : done ? `color-mix(in srgb, ${stage.color} 18%, var(--surface))` : "var(--background)",
                  color: current ? "var(--surface)" : done ? stage.color : "var(--muted)",
                  boxShadow: current ? `0 0 0 5px color-mix(in srgb, ${stage.color} 22%, transparent)` : undefined,
                }}
              >
                {done ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
              </motion.span>
              {stage.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
