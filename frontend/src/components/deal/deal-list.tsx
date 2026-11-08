"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Hourglass, LoaderCircle, MailOpen, RotateCcw, Ship, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { StatusBadge } from "@/components/deal/status-badge";
import { isMyTurn, partnerName, PARTY_LABEL, STAGES, stageFor, stageIndex, viewerParty } from "@/lib/stages";
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

  const invitations = deals.filter((deal) => deal.viewer_role === "invitee");
  const active = deals.filter((deal) => deal.viewer_role !== "invitee");
  const myTurn = active.filter(isMyTurn);
  const finished = active.filter((deal) => !deal.next_actor && deal.status !== "invited");

  const refresh = (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <dl className="flex flex-wrap gap-2 text-sm">
        {[
          { label: "Invitations", value: invitations.length, color: "var(--orchid)" },
          { label: "Your turn", value: myTurn.length, color: "var(--saffron)" },
          { label: "In progress", value: active.length - finished.length, color: "var(--ocean)" },
          { label: "Finished", value: finished.length, color: "var(--mint)" },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="flex items-baseline gap-2 rounded-lg border border-line bg-surface/70 px-3 py-1.5 backdrop-blur"
          >
            <dd className="font-display text-lg font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</dd>
            <dt className="text-muted">{item.label}</dt>
          </motion.div>
        ))}
      </dl>
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
          <p className="text-foreground/70">No deals or invitations yet.</p>
          <p className="mt-1 text-sm text-muted">Start one as a buyer or a seller, or ask your partner to invite this email.</p>
          <ButtonLink href="/deals/new" className="mt-4">Start a deal</ButtonLink>
        </Card>
      </>
    );
  }

  return (
    <>
      {refresh}
      {invitations.length > 0 && (
        <section className="mt-6" aria-labelledby="invitations">
          <h2 id="invitations" className="font-display mb-3 flex items-center gap-2 text-xl font-semibold">
            <MailOpen className="size-5 text-orchid" aria-hidden /> Invitations for you
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {invitations.map((deal, index) => (
              <motion.li
                key={deal.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
              >
                <Link href={`/deals/${deal.id}`} className="group block rounded-xl">
                  <Card className="relative overflow-hidden border-orchid/40 bg-gradient-to-br from-orchid/15 via-surface to-surface transition-transform duration-300 group-hover:-translate-y-0.5">
                    <motion.span
                      aria-hidden
                      className="absolute -right-6 -top-6 size-24 rounded-full bg-orchid/20 blur-2xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    <p className="relative text-xs text-muted">
                      From {partnerName(deal)} · you&apos;d be the {viewerParty(deal)}
                    </p>
                    <p className="relative font-display mt-1 text-lg font-semibold">{deal.quantity} × {deal.product}</p>
                    <p className="relative mt-3 flex items-center gap-1.5 text-sm font-medium text-orchid">
                      Review and add your limit
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </p>
                  </Card>
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
      {active.length > 0 && invitations.length > 0 && (
        <h2 className="font-display mb-3 mt-8 text-xl font-semibold">Your deals</h2>
      )}
      <ul className="mt-3 grid gap-3">
        {active.map((deal, index) => {
          const stage = stageFor(deal);
          const reached = stageIndex(deal);
          const Icon = STAGE_ICONS[stage.key];
          const mine = isMyTurn(deal);
          const party = viewerParty(deal);          return (
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
                      <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        Deal {deal.reference ?? `#${deal.id}`}
                        <span
                          className="rounded-full px-2 py-0.5 font-medium"
                          style={{
                            color: party === "seller" ? "var(--saffron)" : "var(--ocean)",
                            background: `color-mix(in srgb, ${party === "seller" ? "var(--saffron)" : "var(--ocean)"} 15%, transparent)`,
                          }}
                        >
                          {PARTY_LABEL[party]}
                        </span>
                      </p>
                      <p className="font-display text-lg font-semibold leading-snug">
                        {deal.quantity} × {deal.product}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        <span className="text-saffron">{deal.seller_name || deal.invite_email}</span> →{" "}
                        <span className="text-ocean">{deal.buyer_name || deal.invite_email}</span>
                        {deal.total_cents !== null && <> · {money(deal.total_cents)}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {mine ? (
                      <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color: stage.color, background: `color-mix(in srgb, ${stage.color} 16%, transparent)` }}>
                        <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}>
                          <Zap className="size-3.5" aria-hidden />
                        </motion.span>
                        Your turn
                      </span>
                    ) : deal.next_actor ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <Hourglass className="size-3.5" aria-hidden /> Waiting for {partnerName(deal)}
                      </span>
                    ) : null}
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
