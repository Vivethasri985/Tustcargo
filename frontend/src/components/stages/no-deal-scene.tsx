"use client";

import { motion } from "framer-motion";
import { ActivityCard } from "@/components/deal/activity-card";
import { NegotiationCard } from "@/components/deal/negotiation-card";
import { ButtonLink } from "@/components/ui/button";
import { money } from "@/lib/format";
import type { SceneProps } from "./scene-kit";

function GapChart({ buyerMax, sellerMin }: { buyerMax: number; sellerMin: number }) {
  const top = Math.max(buyerMax, sellerMin) * 1.25;
  const pct = (cents: number) => `${(cents / top) * 100}%`;
  return (
    <div className="mt-6 grid gap-4" role="img" aria-label={`The buyer pays up to ${money(buyerMax)}. The seller needs at least ${money(sellerMin)}.`}>
      <div>
        <p className="mb-1 text-xs text-ocean">Buyer pays up to {money(buyerMax)}</p>
        <div className="h-4 rounded-full bg-line">
          <motion.div className="h-full rounded-full bg-ocean" initial={{ width: 0 }} animate={{ width: pct(buyerMax) }} transition={{ duration: 0.8 }} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs text-saffron">Seller needs at least {money(sellerMin)}</p>
        <div className="relative h-4 rounded-full bg-line">
          <motion.div
            className="absolute inset-y-0 right-0 rounded-full bg-saffron"
            style={{ left: pct(sellerMin) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </div>
      </div>
      {sellerMin > buyerMax && (
        <p className="text-sm text-coral">Gap of {money(sellerMin - buyerMax)} per unit. Neither side can move past its limit.</p>
      )}
    </div>
  );
}

export function NoDealScene({ deal }: SceneProps) {
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
          {deal.buyer_max_cents !== undefined && deal.seller_min_cents !== undefined && (
            <GapChart buyerMax={deal.buyer_max_cents} sellerMin={deal.seller_min_cents} />
          )}
          <p className="mt-6 text-sm text-muted">No money moved. Change a limit and try again.</p>
          <ButtonLink href="/deals/new" className="mt-4">Try new limits</ButtonLink>
        </motion.article>
        <NegotiationCard deal={deal} />
      </div>
      <ActivityCard deal={deal} />
    </>
  );
}
