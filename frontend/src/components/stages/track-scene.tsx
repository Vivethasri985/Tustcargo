"use client";

import { motion } from "framer-motion";
import { Anchor, Waves } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { EvidenceList } from "@/components/deal/evidence-list";
import { PaymentSummary } from "@/components/payment/payment-summary";
import { TrackingCard, type TrackingUpdate } from "@/components/shipment/tracking-card";
import type { SceneProps } from "./scene-kit";

export function TrackScene({ deal, busy, post }: SceneProps) {
  const report = deal.watcher;
  const remaining = report ? Math.max(report.projected_day - (deal.events.at(-1)?.day ?? 0), 0) : null;

  return (
    <>
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="sea relative overflow-hidden rounded-2xl border border-ocean/30 p-6 sm:p-8"
      >
        <motion.span
          className="absolute -bottom-6 left-0 right-0 text-ocean/20"
          animate={{ x: [0, -40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <Waves className="h-24 w-full" strokeWidth={0.6} />
        </motion.span>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold">Waiting for delivery</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/75">
              The balance is paid. The buyer can inspect the goods after the carrier records the delivery below.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted">Expected</p>
              <p className="font-display text-4xl font-semibold tabular-nums text-ocean">Day {report?.projected_day ?? "-"}</p>
            </div>
            {remaining !== null && (
              <div>
                <p className="text-xs text-muted">Days to go</p>
                <p className="font-display text-4xl font-semibold tabular-nums">{remaining}</p>
              </div>
            )}
            <Anchor className="size-12 self-center text-ocean/60" strokeWidth={1.2} aria-hidden />
          </div>
        </div>
      </motion.section>

      <TrackingCard
        deal={deal}
        busy={busy}
        featured
        onUpdate={(update: TrackingUpdate) => post("/tracking/updates", JSON.stringify(update))}
      />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <PaymentSummary deal={deal} />
        <div className="-mt-6">
          <EvidenceList deal={deal} />
        </div>
      </div>
      <ActivityCard deal={deal} />
    </>
  );
}
