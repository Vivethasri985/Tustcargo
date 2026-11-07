"use client";

import { AnimatePresence, motion } from "framer-motion";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { STAGES, type Stage } from "@/lib/stages";

export function StageBanner({ stage }: { stage: Stage }) {
  const Icon = STAGE_ICONS[stage.key];
  const finished = stage.key === "settled";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage.key}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="stage-glow stage-ring relative mb-6 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-4 overflow-hidden rounded-2xl border border-line bg-surface/85 p-5 backdrop-blur sm:grid-cols-[auto_1fr_auto] sm:gap-x-5 sm:p-6"
      >
        <div className="relative flex size-14 shrink-0 items-center justify-center self-start sm:size-16 sm:self-center">
          <motion.span
            className="absolute inset-0 rounded-2xl"
            style={{ background: `color-mix(in srgb, ${stage.color} 18%, transparent)` }}
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            initial={{ scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
            className="relative"
            style={{ color: stage.color }}
          >
            <Icon className="size-8" strokeWidth={1.7} aria-hidden />
          </motion.span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: stage.color }}>
            {stage.key === "no_deal"
              ? "Negotiation ended"
              : finished
                ? `All ${STAGES.length} steps complete`
                : `Step ${stage.step} of ${STAGES.length}`}
          </p>
          <p className="font-display mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {stage.key === "track" ? "Shipment on the way" : stage.label}
          </p>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">{stage.summary}</p>
        </div>
        <p className="col-span-2 w-fit rounded-full border border-line bg-background/60 px-3 py-1 text-xs text-muted sm:col-span-1">
          {finished ? (
            "Nothing left to do"
          ) : (
            <>
              Next move: <span className="text-foreground">{stage.actor}</span>
            </>
          )}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
