"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Check, Copy, EyeOff, LoaderCircle, MailCheck, MailWarning, Sparkles, Trash2, X } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { LIMIT_COPY } from "@/components/deal/deal-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { PARTY_LABEL, viewerParty } from "@/lib/stages";
import type { Deal, Party } from "@/types";
import { Fact, Reveal, Stamp, Waiting, type SceneProps } from "./scene-kit";

function creator(deal: Deal) {
  return deal.creator_role === "seller"
    ? { name: deal.seller_name, country: deal.seller_country }
    : { name: deal.buyer_name, country: deal.buyer_country };
}

function ownLimit(deal: Deal, party: Party) {
  return party === "seller"
    ? { price: deal.seller_min_cents, days: deal.seller_lead_days }
    : { price: deal.buyer_max_cents, days: deal.buyer_deadline_days };
}

/** The invitation itself, drawn as a letter sliding out of an envelope. */
function Letter({ deal, children }: { deal: Deal; children?: React.ReactNode }) {
  const from = creator(deal);
  return (
    <div className="relative pt-6">
      <motion.div
        aria-hidden
        className="absolute inset-x-6 top-0 h-24 rounded-t-2xl bg-gradient-to-b from-orchid/40 to-orchid/10"
        style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }}
        initial={{ scaleY: 1 }}
        animate={{ scaleY: [1, -0.2] }}
        transition={{ duration: 0.6, delay: 0.1 }}
      />
      <motion.article
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="paper relative overflow-hidden rounded-sm p-6 sm:p-9"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-muted">Trade invitation {deal.reference}</p>
          <Stamp color="#7b55c9">{PARTY_LABEL[deal.creator_role]}</Stamp>
        </div>
        <p className="mt-4 text-sm text-muted">From</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight">{from.name}</h2>
        <p className="text-sm text-muted">{from.country}</p>
        <dl className="mt-6">
          <Fact label="Goods" value={`${deal.quantity} × ${deal.product}`} />
          <Fact label="They are the" value={deal.creator_role} />
          <Fact label="You would be the" value={deal.creator_role === "seller" ? "buyer" : "seller"} />
          <Fact label="Deposit after both approve" value={`${deal.deposit_percent}%`} />
        </dl>
        {children}
      </motion.article>
    </div>
  );
}

function AcceptPanel({ deal, busy, post }: SceneProps) {
  const party = viewerParty(deal);
  const copy = LIMIT_COPY[party];
  const [limit, setLimit] = useState("");
  const [days, setDays] = useState("");
  const [confirmDecline, setConfirmDecline] = useState(false);

  const accept = (event: FormEvent) => {
    event.preventDefault();
    post("/accept", JSON.stringify({ limit_cents: Math.round(Number(limit) * 100), days: Number(days) }));
  };

  return (
    <Reveal delay={0.2} className="rounded-2xl border border-orchid/40 bg-surface/90 p-6 backdrop-blur sm:p-8">
      <h2 className="font-display text-2xl font-semibold">Join as the {party}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Set your own private limit. As soon as you join, two AI agents bargain inside both limits and show you the result.
      </p>
      <form onSubmit={accept} className="mt-6 grid gap-5">
        <Field label={copy.price}>
          <Input name="limit" type="number" required min={0.01} step="0.01" max={1000000} disabled={busy} value={limit} onChange={(event) => setLimit(event.target.value)} />
        </Field>
        <Field label={copy.days}>
          <Input name="days" type="number" required min={1} max={365} step={1} disabled={busy} value={days} onChange={(event) => setDays(event.target.value)} />
        </Field>
        <p className="flex items-center gap-2 text-xs text-muted">
          <EyeOff className="size-4 text-orchid" aria-hidden /> {copy.priceHint} The other side never sees it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {busy ? "Agents negotiating..." : "Join and start negotiation"}
          </Button>
          {confirmDecline ? (
            <span className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => post("/decline")} className="border-coral/60 text-coral">
                <X className="size-4" aria-hidden /> Yes, decline
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmDecline(false)}>Keep it</Button>
            </span>
          ) : (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmDecline(true)}>
              Decline
            </Button>
          )}
        </div>
      </form>
    </Reveal>
  );
}

function SentPanel({ deal, busy, cancel }: SceneProps) {
  const party = viewerParty(deal);
  const mine = ownLimit(deal, party);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const status = deal.invite_email_status;
  const delivered = status === "sent";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Reveal delay={0.2} className="grid gap-6">
      <div className="rounded-2xl border border-orchid/40 bg-surface/90 p-6 backdrop-blur sm:p-8">
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.4 }}
            className={`flex size-11 items-center justify-center rounded-xl ${delivered ? "bg-mint/15 text-mint" : "bg-warning/15 text-warning"}`}
          >
            {delivered ? <MailCheck className="size-5" aria-hidden /> : <MailWarning className="size-5" aria-hidden />}
          </motion.span>
          <div className="min-w-0 wrap-anywhere">
            <p className="text-xs text-muted">Invitation for</p>
            <p className="font-display text-lg font-semibold">{deal.invite_email}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-foreground/80">
          {status === "sent" && "The email is on its way. They sign up or log in with that address, then add their limit."}
          {status === "pending" && "Sending the email now. Refresh in a moment to check."}
          {status === "failed" && "The email couldn't be sent. Copy the link below and send it to them yourself."}
          {(status === "not_configured" || !status) && "Email isn't set up on this server, so copy the link and send it yourself. It only opens for that email address."}
        </p>
        <Waiting who={`the ${party === "seller" ? "buyer" : "seller"} to join`} className="mt-5">
          The AI agents start bargaining the moment they add their limit.
        </Waiting>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={copyLink}>
            {copied ? <Check className="size-4 text-mint" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Link copied" : "Copy invite link"}
          </Button>
          {confirm ? (
            <>
              <Button variant="outline" disabled={busy} onClick={cancel} className="border-coral/60 text-coral">
                <Trash2 className="size-4" aria-hidden /> Yes, cancel it
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Keep it</Button>
            </>
          ) : (
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(true)}>Cancel invitation</Button>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <EyeOff className="size-4 text-orchid" aria-hidden /> Only you can see this
        </h3>
        <dl className="mt-3">
          <Fact label={party === "seller" ? "Your lowest price" : "Your highest price"} value={money(mine.price)} />
          <Fact label={party === "seller" ? "You deliver within" : "You need it within"} value={`${mine.days ?? "-"} days`} />
        </dl>
      </div>
    </Reveal>
  );
}

export function InviteScene(props: SceneProps) {
  const { deal } = props;
  const invited = deal.viewer_role === "invitee";
  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Letter deal={deal} />
        {invited ? <AcceptPanel {...props} /> : <SentPanel {...props} />}
      </div>
      <ActivityCard deal={deal} />
    </>
  );
}
