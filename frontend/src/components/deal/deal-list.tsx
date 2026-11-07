"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, RotateCcw, Ship } from "lucide-react";
import { motion } from "framer-motion";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { StatusBadge } from "@/components/deal/status-badge";
import { STAGES, stageFor, stageIndex } from "@/lib/stages";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { money } from "@/lib/format";
import type { Deal } from "@/types";

export function DealList() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    setDeals(null);
    apiFetch<Deal[]>("/deals")
      .then((result) => { if (active) setDeals(result); })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "The deals couldn't be loaded.");
      });
    return () => { active = false; };
  }, [retry]);

  if (error) return (
    <div className="mt-6 rounded-2xl border border-warning/20 bg-warning-soft p-5">
      <p role="alert">{error}</p>
      <Button className="mt-3" onClick={() => setRetry((value) => value + 1)}>Retry loading deals</Button>
    </div>
  );
  if (!deals) return <LoaderCircle className="mt-6 size-6 animate-spin" aria-label="Loading" />;

  const refresh = (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">{deals.length} {deals.length === 1 ? "deal" : "deals"}</p>
      <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
        <RotateCcw className="size-4" aria-hidden />
        Refresh deals
      </Button>
    </div>
  );

  if (deals.length === 0) {
    return (
      <>
        {refresh}
        <Card className="mt-3 py-10 text-center">
          <Ship className="mx-auto mb-4 size-8 text-accent/70" strokeWidth={1.3} aria-hidden />
          <p className="text-foreground/70">No deals yet.</p>
          <ButtonLink href="/deals/new" className="mt-4">Start a deal</ButtonLink>
        </Card>
      </>
    );
  }

  return (
    <>
      {refresh}
      <ul className="mt-3 grid gap-3">
        {deals.map((deal, index) => {
          const stage = stageFor(deal);
          const reached = stageIndex(deal);
          const Icon = STAGE_ICONS[stage.key];
          return (
            <motion.li
              key={deal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.5) }}
            >
              <Link href={`/deals/${deal.id}`} className="group block rounded-xl">
                <Card
                  className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden border-l-4 transition-[transform,background-color] duration-300 group-hover:-translate-y-0.5"
                  style={{
                    borderLeftColor: stage.color,
                    background: `linear-gradient(100deg, color-mix(in srgb, ${stage.color} 10%, var(--surface)), var(--surface) 55%)`,
                  }}
                >
                  <div className="flex min-w-[min(100%,18rem)] flex-1 items-center gap-4">
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ color: stage.color, background: `color-mix(in srgb, ${stage.color} 16%, transparent)` }}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 wrap-anywhere">
                      <p className="mb-1 text-xs text-muted">Deal {deal.reference ?? `#${deal.id}`}</p>
                      <p className="font-display text-lg font-semibold leading-snug">
                        {deal.quantity} × {deal.product}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        <span className="text-saffron">{deal.seller_name}</span> →{" "}
                        <span className="text-ocean">{deal.buyer_name}</span> · {money(deal.total_cents)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={deal.status} refundStatus={deal.refund_status} delivered={deal.delivered} />
                      <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: stage.color }} aria-hidden />
                    </div>
                    <span className="flex gap-1" aria-label={`Step ${Math.min(reached + 1, STAGES.length)} of ${STAGES.length}`} role="img">
                      {STAGES.map((item, step) => (
                        <span
                          key={item.key}
                          className="h-1.5 w-4 rounded-full"
                          style={{ background: step < reached || (step === reached && stage.key !== "no_deal") ? item.color : "var(--line)" }}
                        />
                      ))}
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </>
  );
}
