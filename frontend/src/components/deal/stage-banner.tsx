"use client";

import { AnimatePresence, motion } from "framer-motion";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { isMyTurn, STAGES, turnLabel, type Stage } from "@/lib/stages";
import type { Deal } from "@/types";

export function StageBanner({ stage, deal }: { stage: Stage; deal?: Deal }) {
  const Icon = STAGE_ICONS[stage.key];
  const finished = stage.key === "settled" || stage.key === "no_deal" || stage.key === "declined";
  const mine = deal ? isMyTurn(deal) : false;
  const who = deal ? turnLabel(deal) : stage.actor;

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
              : stage.key === "declined"
                ? "Before negotiation"
              : stage.key === "invite"
                ? "Before step 1"
              : finished
                ? `All ${STAGES.length} steps complete`
                : `Step ${stage.step} of ${STAGES.length}`}
          </p>
          <p className="font-display mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {stage.key === "track" ? "Shipment on the way" : stage.label}
          </p>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">{stage.summary}</p>
        </div>
        <p
          className="relative col-span-2 flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs sm:col-span-1"
          style={mine && !finished
            ? { borderColor: stage.color, color: stage.color, background: `color-mix(in srgb, ${stage.color} 14%, transparent)` }
            : { borderColor: "var(--line)", color: "var(--muted)", background: "color-mix(in srgb, var(--background) 60%, transparent)" }}
        >
          {mine && !finished && (
            <motion.span
              className="size-2 rounded-full"
              style={{ background: stage.color }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              aria-hidden
            />
          )}
          {finished ? (
            "Nothing left to do"
          ) : (
            <>
              Next move: <span className={mine ? "font-semibold" : "text-foreground"}>{mine ? "You" : who}</span>
            </>
          )}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
