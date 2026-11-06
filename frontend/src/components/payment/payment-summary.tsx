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

export function PaymentSummary({ deal }: { deal: Deal }) {
  const paymentStatus = (kind: "deposit" | "balance") =>
    deal.payments.find((payment) => payment.kind === kind)?.status ?? "Not started";

  return (
    <Card>
      <CardTitle>Deal terms</CardTitle>
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
