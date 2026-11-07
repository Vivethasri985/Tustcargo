"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";

const DETAILS: Record<string, { you: string; screen: string }> = {
  negotiate: {
    you: "Open New deal, pick the product and quantity, then enter the buyer's maximum price and the seller's minimum price. Click Start AI negotiation.",
    screen: "A chat between the buyer and seller agents, round by round, with a chart showing their offers getting closer.",
  },
  approve: {
    you: "Read the price, total, deposit and delivery time. The buyer clicks Approve as buyer, and the seller clicks Approve as seller.",
    screen: "Nothing is paid until both buttons are pressed.",
  },
  deposit: {
    you: "As the buyer, click Pay with PayPal, log in to PayPal and approve the deposit. You return to TrustCargo automatically.",
    screen: "The deposit turns blue in the money bar and the seller is told to ship.",
  },
  ship: {
    you: "As the seller, choose the carrier, enter the tracking number and quantity, and upload a photo or PDF of the shipping receipt.",
    screen: "The proof checker compares your files with the order. If something doesn't match, the buyer decides whether to accept it.",
  },
  balance: {
    you: "As the buyer, pay the rest on PayPal once the proof has passed.",
    screen: "The tracking number is added to the PayPal payment, and the balance turns green in the money bar.",
  },
  track: {
    you: "The seller or carrier records each stop on the route, or reports a delay with a short note.",
    screen: "A ship moves along the route. The Watcher says whether delivery is on time, late, or past the buyer's deadline.",
  },
  inspect: {
    you: "When the goods arrive, the buyer enters how many arrived and how many are damaged, with photos if needed.",
    screen: "If anything is missing, the Judge suggests a refund. The seller approves or rejects it.",
  },
  settled: {
    you: "Nothing more to do. Open the deal at any time to see the full record.",
    screen: "The activity log shows every action, who did it and when, along with every file uploaded.",
  },
};

export function StepExplorer() {
  const [selected, setSelected] = useState(0);
  const stage = STAGES[selected];
  const detail = DETAILS[stage.key];
  const Icon = STAGE_ICONS[stage.key];

  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1" aria-label="Deal steps">
        {STAGES.map((item, index) => {
          const ItemIcon = STAGE_ICONS[item.key];
          const active = index === selected;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(index)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  active ? "border-transparent text-foreground" : "border-line text-muted hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="guide-step"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `color-mix(in srgb, ${item.color} 18%, var(--surface))`, boxShadow: `inset 0 0 0 1px ${item.color}` }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <ItemIcon className="relative size-4 shrink-0" style={{ color: item.color }} aria-hidden />
                <span className="relative">
                  <span className="text-xs text-muted">{item.step}.</span> {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="relative min-h-72 overflow-hidden rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur sm:p-8" style={{ borderTopColor: stage.color, borderTopWidth: 3 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="absolute -right-10 -top-10 size-48 rounded-full blur-3xl"
              style={{ background: `color-mix(in srgb, ${stage.color} 25%, transparent)` }}
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl" style={{ color: stage.color, background: `color-mix(in srgb, ${stage.color} 16%, transparent)` }}>
                <Icon className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs" style={{ color: stage.color }}>Step {stage.step} of {STAGES.length}, done by {stage.actor.toLowerCase()}</p>
                <h3 className="font-display text-2xl font-semibold">{stage.label}</h3>
              </div>
            </div>
            <p className="relative mt-5 text-foreground/90">{stage.summary}</p>
            <dl className="relative mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold">What you do</dt>
                <dd className="mt-1 text-sm leading-6 text-muted">{detail.you}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">What you see</dt>
                <dd className="mt-1 text-sm leading-6 text-muted">{detail.screen}</dd>
              </div>
            </dl>
            <div className="relative mt-7 flex gap-2">
              <button
                type="button"
                disabled={selected === 0}
                onClick={() => setSelected((value) => value - 1)}
                className="rounded-md border border-line px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous step
              </button>
              <button
                type="button"
                disabled={selected === STAGES.length - 1}
                onClick={() => setSelected((value) => value + 1)}
                className="rounded-md px-3 py-2 text-sm text-background disabled:opacity-40"
                style={{ background: stage.color }}
              >
                Next step
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
