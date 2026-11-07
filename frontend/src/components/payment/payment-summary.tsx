"use client";

import { motion } from "framer-motion";
import { Card, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/format";
import type { Deal } from "@/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 py-3 text-sm last:border-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function MoneyFlow({ deal }: { deal: Deal }) {
  const total = deal.total_cents ?? 0;
  if (!total) return null;

  const paid = (kind: "deposit" | "balance") =>
    deal.payments.some((payment) => payment.kind === kind && payment.status === "COMPLETED");
  const refund = deal.refund_status === "COMPLETED" ? deal.refund_suggested_cents ?? 0 : 0;
  const parts = [
    { key: "deposit", label: "Deposit", cents: deal.deposit_cents ?? 0, done: paid("deposit") },
    { key: "balance", label: "Balance", cents: deal.balance_cents ?? 0, done: paid("balance") },
  ];
  const kept = parts.filter((part) => part.done).reduce((sum, part) => sum + part.cents, 0) - refund;

  return (
    <div className="mt-4">
      <div
        className="relative flex h-4 overflow-hidden rounded-full bg-background/70"
        role="img"
        aria-label={`${money(Math.max(kept, 0))} of ${money(total)} has reached the seller${refund ? ` after a ${money(refund)} refund` : ""}.`}
      >
        {parts.map((part, index) => (
          <motion.div
            key={part.key}
            initial={{ width: 0 }}
            animate={{ width: `${(part.cents / total) * 100}%` }}
            transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="h-full border-r border-background last:border-0"
            style={{
              background: part.done
                ? index === 0 ? "var(--paypal)" : "var(--mint)"
                : "repeating-linear-gradient(135deg, var(--line) 0 6px, transparent 6px 12px)",
            }}
          />
        ))}
        {refund > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(refund / total) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute inset-y-0 right-0 bg-coral"
          />
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li><span className="mr-1.5 inline-block size-2 rounded-full bg-paypal" />Deposit paid</li>
        <li><span className="mr-1.5 inline-block size-2 rounded-full bg-mint" />Balance paid</li>
        {refund > 0 && <li><span className="mr-1.5 inline-block size-2 rounded-full bg-coral" />Refunded</li>}
        <li><span className="mr-1.5 inline-block size-2 rounded-full border border-line" />Not paid yet</li>
      </ul>
    </div>
  );
}

export function PaymentSummary({ deal }: { deal: Deal }) {
  const paymentStatus = (kind: "deposit" | "balance") =>
    deal.payments.find((payment) => payment.kind === kind)?.status ?? "Not started";

  return (
    <Card>
      <CardTitle>Deal terms</CardTitle>
      <MoneyFlow deal={deal} />
      <dl className="mt-3 grid">
        <Row label="Price per unit" value={money(deal.unit_price_cents)} />
        <Row label="Quantity" value={String(deal.quantity)} />
        <Row label="Total" value={money(deal.total_cents)} />
        <Row label="Delivery" value={deal.delivery_days ? `${deal.delivery_days} days` : "-"} />
        <Row
          label={`Deposit (${deal.deposit_percent}%)`}
          value={`${money(deal.deposit_cents)} · ${paymentStatus("deposit")}`}
        />
        <Row
          label="Balance"
          value={`${money(deal.balance_cents)} · ${paymentStatus("balance")}`}
        />
        {deal.refund_id && (
          <Row
            label="Refund"
            value={`${money(deal.refund_suggested_cents)} · ${deal.refund_status}`}
          />
        )}
        {deal.tracking_number && (
          <Row label="Tracking" value={`${deal.carrier} ${deal.tracking_number}`} />
        )}
      </dl>
    </Card>
  );
}
