"use client";

import { motion } from "framer-motion";
import { Check, FileSignature } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { NegotiationCard } from "@/components/deal/negotiation-card";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { DocumentButton, findDocument } from "@/components/deal/documents-bar";
import { viewerParty } from "@/lib/stages";
import { Fact, Reveal, Stamp, type SceneProps } from "./scene-kit";

function Signature({
  party,
  name,
  country,
  approved,
  busy,
  mine,
  onApprove,
}: {
  party: "buyer" | "seller";
  name: string;
  country: string;
  approved: boolean;
  busy: boolean;
  mine: boolean;
  onApprove: () => void;
}) {
  const label = party === "buyer" ? "Buyer" : "Seller";
  return (
    <div className="relative">
      <p className="text-xs text-muted">{label}{mine && <span className="ml-1.5 rounded-full bg-[#a85a17]/15 px-2 py-0.5 text-[#8f4a10]">You</span>}</p>
      <p className="font-display text-lg font-semibold">{name}</p>
      <p className="text-sm text-muted">{country}</p>
      <div className="relative mt-5 flex h-14 items-end border-b-2 border-foreground/40">
        {approved ? (
          <motion.span
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="pb-1 pr-4 font-display text-2xl italic text-foreground/80"
          >
            {name}
          </motion.span>
        ) : (
          <span className="pb-1 text-sm text-muted">{mine ? "Sign here" : "Waiting for their signature"}</span>
        )}
        {approved && (
          <span className="absolute right-0 -top-3">
            <Stamp color="#1f7a5c">Approved</Stamp>
          </span>
        )}
      </div>
      {mine && (
        <Button className="mt-4 w-full" disabled={busy || approved} onClick={onApprove}>
          <Check className="size-4" aria-hidden />
          {approved ? "You approved" : "Approve these terms"}
        </Button>
      )}
    </div>
  );
}

export function ApproveScene({ deal, busy, approve }: SceneProps) {
  const me = viewerParty(deal);
  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <motion.article
          initial={{ opacity: 0, y: 24, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="paper relative overflow-hidden rounded-sm p-6 sm:p-10"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted">Trade agreement {deal.reference}</p>
            <FileSignature className="size-7 text-[#a85a17]" aria-hidden />
          </div>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Both people must approve</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            The AI agents reached these terms inside both private limits. Nothing is paid until you and your partner both sign.
          </p>
          <dl className="mt-7">
            <Fact label="Goods" value={`${deal.quantity} × ${deal.product}`} />
            <Fact label="Price per unit" value={money(deal.unit_price_cents)} />
            <Fact label="Total" value={<span className="font-display text-lg">{money(deal.total_cents)}</span>} />
            <Fact label={`Deposit, due after signing (${deal.deposit_percent}%)`} value={money(deal.deposit_cents)} />
            <Fact label="Balance, due after shipping proof is checked" value={money(deal.balance_cents)} />
            <Fact label="Seller ships within" value={`${deal.delivery_days ?? "-"} days`} />
            <Fact label="Buyer needs the goods within" value={`${deal.buyer_deadline_days} days`} />
          </dl>
          <div className="mt-9 grid gap-8 sm:grid-cols-2">
            <Signature
              party="buyer"
              name={deal.buyer_name}
              country={deal.buyer_country}
              approved={deal.buyer_approved}
              busy={busy}
              mine={me === "buyer"}
              onApprove={approve}
            />
            <Signature
              party="seller"
              name={deal.seller_name}
              country={deal.seller_country}
              approved={deal.seller_approved}
              busy={busy}
              mine={me === "seller"}
              onApprove={approve}
            />
          </div>
          <DocumentButton doc={findDocument(deal, "agreement")} className="mt-8" ink="#8f4a10" />
        </motion.article>
        <Reveal delay={0.15}>
          <NegotiationCard deal={deal} />
        </Reveal>
      </div>
      <ActivityCard deal={deal} />
    </>
  );
}
