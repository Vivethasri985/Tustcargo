"use client";

import { motion } from "framer-motion";
import { EyeOff } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { NegotiationCard } from "@/components/deal/negotiation-card";
import { ButtonLink } from "@/components/ui/button";
import { money } from "@/lib/format";
import { partnerName, viewerParty } from "@/lib/stages";
import { Fact, type SceneProps } from "./scene-kit";

/** Two bars that never meet: your side is filled, theirs stays hidden. */
function Gap({ seller }: { seller: boolean }) {
  return (
    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-hidden>
      <motion.div
        className="h-3 rounded-full bg-ocean"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ transformOrigin: "left", opacity: seller ? 0.25 : 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.span
        className="text-xs text-coral"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6, 1] }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        no overlap
      </motion.span>
      <motion.div
        className="h-3 rounded-full bg-saffron"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ transformOrigin: "right", opacity: seller ? 1 : 0.25 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
    </div>
  );
}

export function NoDealScene({ deal }: SceneProps) {
  const seller = viewerParty(deal) === "seller";
  const price = seller ? deal.seller_min_cents : deal.buyer_max_cents;
  const days = seller ? deal.seller_lead_days : deal.buyer_deadline_days;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-coral/40 bg-surface/90 p-6 backdrop-blur sm:p-8"
        >
          <h2 className="font-display text-3xl font-semibold">No deal</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/75">{deal.transcript[0]?.message}</p>
          <Gap seller={seller} />
          <div className="mt-6 rounded-xl border border-line p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <EyeOff className="size-4 text-orchid" aria-hidden /> Your limit, still private
            </p>
            <dl className="mt-2">
              <Fact label={seller ? "Lowest price you'd accept" : "Highest price you'd pay"} value={money(price)} />
              <Fact label={seller ? "You deliver within" : "You need it within"} value={`${days ?? "-"} days`} />
            </dl>
          </div>
          <p className="mt-6 text-sm text-muted">
            No money moved, and {partnerName(deal)} never saw your numbers. Start a new deal if either of you can move.
          </p>
          <ButtonLink href="/deals/new" className="mt-4">Start a new deal</ButtonLink>
        </motion.article>
        <NegotiationCard deal={deal} />
      </div>
      <ActivityCard deal={deal} />
    </>
  );
}
