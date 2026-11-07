"use client";

import { motion } from "framer-motion";
import { ActivityCard } from "@/components/deal/activity-card";
import { EvidenceList } from "@/components/deal/evidence-list";
import { NegotiationCard } from "@/components/deal/negotiation-card";
import { PaymentSummary } from "@/components/payment/payment-summary";
import { TrackingCard } from "@/components/shipment/tracking-card";
import { money } from "@/lib/format";
import { Reveal, Stamp, type SceneProps } from "./scene-kit";

function Line({ label, value, sign }: { label: string; value: number; sign: "+" | "-" | "=" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-line py-3 last:border-0">
      <dt className="text-sm">{label}</dt>
      <dd className="font-display shrink-0 whitespace-nowrap text-lg tabular-nums">
        {sign === "-" ? "- " : sign === "=" ? "" : "+ "}
        {money(value)}
      </dd>
    </div>
  );
}

export function SettledScene({ deal, busy }: SceneProps) {
  const paid = (kind: "deposit" | "balance") =>
    deal.payments.find((payment) => payment.kind === kind && payment.status === "COMPLETED")?.amount_cents ?? 0;
  const refundDone = deal.status === "refunded" && deal.refund_status === "COMPLETED";
  const refund = refundDone ? deal.refund_suggested_cents ?? 0 : 0;
  const net = paid("deposit") + paid("balance") - refund;
  const rounds = Math.max(0, ...deal.transcript.map((line) => line.round ?? 0));

  const title =
    deal.status === "refunded"
      ? refundDone ? "Refund sent" : "Refund status"
      : deal.status === "claim_rejected" ? "Claim rejected" : "Order closed";
  const detail =
    deal.status === "refunded"
      ? refundDone
        ? `${money(deal.refund_suggested_cents)} was refunded through PayPal.`
        : `PayPal has not confirmed this refund as complete. Current status: ${deal.refund_status ?? "Unavailable"}. Use Refresh status to check for updates.`
      : deal.status === "claim_rejected"
        ? "The seller rejected the suggested refund, so no refund was sent."
        : "The deal is settled.";

  const tiles = [
    { label: "Agreed price", value: money(deal.unit_price_cents), color: "var(--orchid)" },
    { label: "Rounds of bargaining", value: String(rounds || deal.transcript.length), color: "var(--orchid)" },
    { label: "Delivered on", value: deal.watcher ? `Day ${deal.watcher.projected_day}` : "-", color: "var(--ocean)" },
    { label: "Files on record", value: String(deal.evidence.length), color: "var(--saffron)" },
  ];

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="paper paper-mint relative overflow-hidden rounded-sm p-6 sm:p-10"
        >
          <span className="absolute right-6 top-6">
            <Stamp color={refundDone || deal.status !== "refunded" ? "#1f7a5c" : "#a85a17"}>
              {refundDone || deal.status !== "refunded" ? "Settled" : "Pending"}
            </Stamp>
          </span>
          <p className="pr-28 text-sm text-muted">Closing statement {deal.reference}</p>
          <h2 className="font-display mt-2 pr-24 text-3xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">{detail}</p>
          <dl className="mt-7">
            <Line label="Deposit received through PayPal" value={paid("deposit")} sign="+" />
            <Line label="Balance received through PayPal" value={paid("balance")} sign="+" />
            {refund > 0 && <Line label="Refund returned to the buyer" value={refund} sign="-" />}
          </dl>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-foreground/70 pt-4">
            <p className="font-medium">Seller keeps</p>
            <p className="font-display text-4xl font-semibold tabular-nums">{money(net)}</p>
          </div>
          <p className="mt-6 text-xs text-muted">
            {deal.quantity} × {deal.product}, {deal.seller_name} to {deal.buyer_name}.
          </p>
        </motion.article>

        <Reveal delay={0.15} className="grid grid-cols-2 gap-4">
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.08, type: "spring", stiffness: 220, damping: 18 }}
              className="rounded-2xl border border-line bg-surface/90 p-5 backdrop-blur"
              style={{ borderTopColor: tile.color, borderTopWidth: 3 }}
            >
              <p className="text-xs text-muted">{tile.label}</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums" style={{ color: tile.color }}>
                {tile.value}
              </p>
            </motion.div>
          ))}
        </Reveal>
      </div>

      <h2 className="font-display mt-12 text-2xl font-semibold">Full record</h2>
      <p className="mt-1 text-sm text-muted">Everything that happened in this deal, kept for both sides.</p>
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-2">
        <NegotiationCard deal={deal} />
        <PaymentSummary deal={deal} />
      </div>
      <TrackingCard deal={deal} busy={busy} onUpdate={() => undefined} />
      <EvidenceList deal={deal} />
      <ActivityCard deal={deal} />
    </>
  );
}
