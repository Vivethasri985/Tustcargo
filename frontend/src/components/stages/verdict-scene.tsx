"use client";

import { motion } from "framer-motion";
import { Gavel, RotateCcw, X } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { EvidenceList } from "@/components/deal/evidence-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { Fact, Reveal, type SceneProps } from "./scene-kit";

export function VerdictScene({ deal, busy, post }: SceneProps) {
  const received = deal.received_quantity ?? 0;
  const damaged = deal.damaged_quantity ?? 0;
  const affected = Math.max(deal.quantity - received, 0) + damaged;
  const claimed = affected * (deal.unit_price_cents ?? 0);
  const suggested = deal.refund_suggested_cents ?? 0;
  const photos = deal.evidence.filter((item) => item.stage === "claim").length;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.25fr]">
        <Reveal className="rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur">
          <h3 className="font-display text-lg font-semibold">Evidence the Judge considered</h3>
          <dl className="mt-4">
            <Fact label="Ordered" value={deal.quantity} />
            <Fact label="Shipped, per seller" value={deal.shipped_quantity ?? "-"} />
            <Fact label="Received, per buyer" value={received} accent={received < deal.quantity ? "var(--coral)" : undefined} />
            <Fact label="Damaged" value={damaged} accent={damaged ? "var(--saffron)" : undefined} />
            <Fact label="Delivered on" value={deal.watcher ? `Day ${deal.watcher.projected_day}` : "-"} accent={deal.watcher?.missed_deadline ? "var(--saffron)" : undefined} />
            <Fact label="Buyer photos" value={photos} />
          </dl>
          {deal.inspection_notes && (
            <blockquote className="mt-4 rounded-lg border-l-4 border-ocean bg-ocean/10 p-3 text-sm">
              <span className="text-xs text-muted">Buyer&apos;s note</span>
              <p className="mt-1">{deal.inspection_notes}</p>
            </blockquote>
          )}
        </Reveal>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-coral/40 bg-gradient-to-br from-coral/15 via-surface/95 to-surface/95 p-6 shadow-[0_30px_80px_-40px_var(--coral)] backdrop-blur sm:p-8"
        >
          <motion.span
            className="absolute right-6 top-6 text-coral"
            initial={{ rotate: -40 }}
            animate={{ rotate: [-40, 10, 0] }}
            transition={{ duration: 0.7, delay: 0.4 }}
            aria-hidden
          >
            <Gavel className="size-10" strokeWidth={1.5} />
          </motion.span>
          <div className="flex flex-wrap items-center gap-2 pr-14">
            <h2 className="font-display text-2xl font-semibold">Seller: review the suggested refund</h2>
          </div>
          <Badge className="mt-3">{deal.claim?.mode === "ai" ? "Groq AI review" : "Rule-based fallback"}</Badge>
          <p className="mt-6 text-sm text-muted">Suggested refund</p>
          <p className="font-display text-6xl font-semibold tabular-nums text-coral">{money(suggested)}</p>
          <p className="mt-2 text-sm text-muted">
            {affected} affected {affected === 1 ? "unit" : "units"} × {money(deal.unit_price_cents)} = {money(claimed)}
            {suggested < claimed && `, capped at ${money(suggested)}`}
          </p>
          {deal.claim?.reasoning && (
            <blockquote className="mt-5 border-l-2 border-coral pl-4 text-foreground/85">{deal.claim.reasoning}</blockquote>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button className="bg-coral" disabled={busy} onClick={() => post("/claim/approve")}>
              <RotateCcw className="size-4" aria-hidden />
              Approve refund
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => post("/claim/reject")}>
              <X className="size-4" aria-hidden />
              Reject
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted">Approving sends the refund from the balance payment through PayPal.</p>
        </motion.article>
      </div>
      <EvidenceList deal={deal} />
      <ActivityCard deal={deal} />
    </>
  );
}
