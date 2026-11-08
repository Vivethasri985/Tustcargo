"use client";

import { motion } from "framer-motion";
import { FileImage, Hash, PackageCheck, PackageOpen, Truck } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { PaymentSummary } from "@/components/payment/payment-summary";
import { ShipmentForm } from "@/components/shipment/shipment-form";
import { Button } from "@/components/ui/button";
import { viewerParty } from "@/lib/stages";
import { Barcode, Reveal, Stamp, Waiting, type SceneProps } from "./scene-kit";

const CHECKS = [
  { icon: PackageCheck, text: "The quantity you ship matches the order." },
  { icon: Hash, text: "The tracking number fits the carrier's format." },
  { icon: FileImage, text: "The receipt or photo is readable and matches the goods." },
  { icon: Truck, text: "Once it passes, the tracking number is added to the PayPal deposit." },
];

export function ShipScene({ deal, busy, post }: SceneProps) {
  const onHold = deal.verification && !deal.verification.matches;
  const seller = viewerParty(deal) === "seller";

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.article
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="waybill relative overflow-hidden rounded-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 bg-saffron px-6 py-4 text-background">
            <p className="flex items-center gap-2 font-display text-xl font-bold">
              <PackageOpen className="size-6" aria-hidden /> Waybill
            </p>
            <div className="text-right">
              <Barcode value={deal.reference ?? String(deal.id)} className="h-8 w-36 text-background" />
              <p className="text-[11px] font-medium">{deal.reference}</p>
            </div>
          </div>
          <div className="grid divide-y divide-dashed divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <p className="text-xs text-muted">From</p>
              <p className="font-display text-lg font-semibold text-saffron">{deal.seller_name}</p>
              <p className="text-sm text-muted">{deal.seller_country}</p>
            </div>
            <div className="p-5">
              <p className="text-xs text-muted">To</p>
              <p className="font-display text-lg font-semibold text-ocean">{deal.buyer_name}</p>
              <p className="text-sm text-muted">{deal.buyer_country}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-dashed border-line px-5 py-3 text-sm">
            <span>Contents: <span className="font-medium">{deal.quantity} × {deal.product}</span></span>
            <span className="text-muted">Deliver within {deal.delivery_days} days</span>
          </div>
          <div className="relative p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold">
              {seller ? "Upload shipping proof" : onHold ? "Review the shipping proof" : "Waiting for the shipment"}
            </h2>
            {onHold && (
              <div className="relative mt-4 rounded-xl border border-coral/40 bg-coral/10 p-4 pr-28 text-sm leading-6">
                <span className="absolute right-3 top-3">
                  <Stamp color="var(--coral)">On hold</Stamp>
                </span>
                <p className="font-medium">{deal.verification!.summary}</p>
                <ul className="mt-1 list-disc pl-5">
                  {deal.verification!.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                {seller ? (
                  <p className="mt-3 text-foreground/75">
                    Upload corrected proof below, or wait for {deal.buyer_name} to accept it as it is.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-foreground/75">
                      If you agree to this shipment anyway, accept it and the balance unlocks. Otherwise wait for new proof.
                    </p>
                    <Button variant="outline" className="mt-3" disabled={busy} onClick={() => post("/shipment/accept")}>
                      Accept this proof anyway
                    </Button>
                  </>
                )}
              </div>
            )}
            {seller ? (
              <ShipmentForm quantity={deal.quantity} busy={busy} onSubmit={(data) => post("/shipment", data)} />
            ) : (
              !onHold && (
                <Waiting who={`${deal.seller_name} to ship`} className="mt-4">
                  Your deposit is paid. The AI checks the seller&apos;s proof before you&apos;re asked for the balance.
                </Waiting>
              )
            )}
          </div>
        </motion.article>

        <Reveal delay={0.15} className="grid gap-6">
          <div className="rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur">
            <h3 className="font-display text-lg font-semibold">What the proof checker looks at</h3>
            <ul className="mt-4 grid gap-4">
              {CHECKS.map(({ icon: Icon, text }, index) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.08 }}
                  className="flex gap-3 text-sm leading-6"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-saffron/15 text-saffron">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </div>
          <PaymentSummary deal={deal} />
        </Reveal>
      </div>
      <ActivityCard deal={deal} />
    </>
  );
}
