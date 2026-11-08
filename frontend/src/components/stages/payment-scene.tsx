"use client";

import { motion } from "framer-motion";
import { BadgeCheck, CreditCard, Lock, ShieldCheck, Store, User } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { EvidenceList } from "@/components/deal/evidence-list";
import { PaymentSummary } from "@/components/payment/payment-summary";
import { TrackingCard, type TrackingUpdate } from "@/components/shipment/tracking-card";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DocumentButton, findDocument } from "@/components/deal/documents-bar";
import { viewerParty } from "@/lib/stages";
import { Barcode, Reveal, Waiting, type SceneProps } from "./scene-kit";

function MoneyRoute({ amount }: { amount: string }) {
  const nodes = [
    { icon: User, label: "Buyer", color: "var(--ocean)" },
    { icon: CreditCard, label: "PayPal", color: "var(--paypal)" },
    { icon: Store, label: "Seller", color: "var(--saffron)" },
  ];
  return (
    <div className="relative mt-7 grid grid-cols-3 items-start">
      <div className="absolute left-[16.6%] right-[16.6%] top-6 h-0.5 bg-line" aria-hidden>
        <motion.span
          className="absolute -top-2.5 flex h-5 items-center rounded-full bg-paypal px-2 text-[10px] font-semibold text-background"
          animate={{ left: ["0%", "100%"], x: ["0%", "-100%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
        >
          {amount}
        </motion.span>
      </div>
      {nodes.map(({ icon: Icon, label, color }) => (
        <div key={label} className="relative grid justify-items-center gap-2 text-xs text-muted">
          <span className="flex size-12 items-center justify-center rounded-full border-2 bg-surface" style={{ borderColor: color, color }}>
            <Icon className="size-5" aria-hidden />
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

function Schedule({ kind, deal }: { kind: "deposit" | "balance"; deal: SceneProps["deal"] }) {
  const paid = (which: "deposit" | "balance") =>
    deal.payments.some((payment) => payment.kind === which && payment.status === "COMPLETED");
  const rows = [
    { key: "deposit", label: "Deposit", amount: deal.deposit_cents, done: paid("deposit"), now: kind === "deposit" },
    { key: "balance", label: "Balance", amount: deal.balance_cents, done: paid("balance"), now: kind === "balance" },
  ];
  return (
    <div className="rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur">
      <h3 className="font-display text-lg font-semibold">Payment schedule</h3>
      <ol className="mt-4 grid gap-3">
        {rows.map((row) => (
          <li
            key={row.key}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border p-4 text-sm",
              row.now ? "border-paypal bg-paypal/10" : "border-line",
            )}
          >
            <span className="flex items-center gap-3">
              {row.done ? (
                <BadgeCheck className="size-5 text-mint" aria-hidden />
              ) : row.now ? (
                <CreditCard className="size-5 text-paypal" aria-hidden />
              ) : (
                <Lock className="size-5 text-muted" aria-hidden />
              )}
              <span>
                <span className="block font-medium">{row.label}</span>
                <span className="text-xs text-muted">{row.done ? "Paid" : row.now ? "Due now" : "Unlocks after shipping proof"}</span>
              </span>
            </span>
            <span className="font-display text-lg tabular-nums">{money(row.amount)}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 rounded-xl border border-dashed border-line p-4 text-xs text-muted">
          <ShieldCheck className="size-5 text-coral" aria-hidden />
          A refund comes from the balance if goods are missing or damaged.
        </li>
      </ol>
    </div>
  );
}

export function PaymentScene({ deal, busy, pendingCapture, pay, post, kind }: SceneProps & { kind: "deposit" | "balance" }) {
  const amount = kind === "deposit" ? deal.deposit_cents : deal.balance_cents;
  const verification = deal.verification;
  const buyer = viewerParty(deal) === "buyer";

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <motion.article
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-paypal/40 bg-surface/95 shadow-[0_30px_80px_-40px_var(--paypal)] backdrop-blur"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-paypal/30 via-paypal/10 to-transparent px-6 py-4 sm:px-8">
            <p className="text-sm">
              Invoice <span className="font-medium">{deal.reference}-{kind === "deposit" ? "DEP" : "BAL"}</span>
            </p>
            <Barcode value={`${deal.reference}${kind}`} className="h-7 w-28 text-foreground/60" />
          </div>
          <div className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">
              {buyer
                ? kind === "deposit" ? "Pay the deposit" : "Pay the balance"
                : kind === "deposit" ? "Deposit due from the buyer" : "Balance due from the buyer"}
            </h2>
            <p className="mt-6 text-sm text-muted">Amount due</p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-6xl font-semibold tracking-tight tabular-nums text-paypal sm:text-7xl"
            >
              {money(amount)}
            </motion.p>
            <p className="mt-2 text-sm text-muted">
              {kind === "deposit"
                ? `${deal.deposit_percent}% of ${money(deal.total_cents)} for ${deal.quantity} × ${deal.product}.`
                : `${money(deal.total_cents)} total, less the ${money(deal.deposit_cents)} deposit already paid.`}
            </p>

            {kind === "balance" && verification && (
              <div className="mt-6 rounded-xl border border-mint/30 bg-mint/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-mint">
                  <BadgeCheck className="size-4" aria-hidden /> Shipping proof checked
                </p>
                <p className="mt-1 text-foreground/80">{verification.summary}</p>
              </div>
            )}

            <MoneyRoute amount={money(amount)} />

            {buyer ? (
              <p className="mt-7 text-sm text-foreground/70">
                You&apos;ll complete this {money(amount)} payment on PayPal.
              </p>
            ) : (
              <Waiting who={`${deal.buyer_name} to pay`} className="mt-7">
                {kind === "deposit"
                  ? "You'll be able to ship and upload proof once the deposit lands."
                  : "Keep recording shipment updates below while you wait."}
              </Waiting>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {buyer && (
                <Button
                  className="w-full bg-paypal py-3.5 text-base sm:w-auto sm:px-10"
                  disabled={busy || pendingCapture !== null}
                  onClick={() => pay(kind)}
                >
                  <CreditCard className="size-5" aria-hidden />
                  {kind === "deposit" ? "Pay with PayPal" : `Pay ${money(amount)} with PayPal`}
                </Button>
              )}
              <DocumentButton doc={findDocument(deal, kind)} />
            </div>
          </div>
        </motion.article>
        <Reveal delay={0.15} className="grid gap-6">
          <Schedule kind={kind} deal={deal} />
          <PaymentSummary deal={deal} />
        </Reveal>
      </div>
      {kind === "balance" && (
        <TrackingCard
          deal={deal}
          busy={busy}
          canUpdate={!buyer}
          onUpdate={(update: TrackingUpdate) => post("/tracking/updates", JSON.stringify(update))}
        />
      )}
      <EvidenceList deal={deal} />
      <ActivityCard deal={deal} />
    </>
  );
}
