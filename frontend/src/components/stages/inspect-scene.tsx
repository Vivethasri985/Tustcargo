"use client";

import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { ActivityCard } from "@/components/deal/activity-card";
import { EvidenceList } from "@/components/deal/evidence-list";
import { InspectionForm } from "@/components/claim/inspection-form";
import { TrackingCard } from "@/components/shipment/tracking-card";
import { money } from "@/lib/format";
import { viewerParty } from "@/lib/stages";
import { Reveal, Waiting, type SceneProps } from "./scene-kit";

const R = 80;
const C = 2 * Math.PI * R;

function CountDial({ ordered, received, damaged }: { ordered: number; received: number; damaged: number }) {
  const good = Math.max(Math.min(received, ordered) - damaged, 0);
  const bad = Math.min(damaged, received);
  const missing = Math.max(ordered - received, 0);
  const part = (count: number) => (ordered ? (count / ordered) * C : 0);
  const segments = [
    { key: "good", count: good, color: "var(--mint)", label: "In good condition" },
    { key: "damaged", count: bad, color: "var(--saffron)", label: "Damaged" },
    { key: "missing", count: missing, color: "var(--coral)", label: "Missing" },
  ];
  let offset = 0;

  return (
    <div className="grid justify-items-center">
      <svg viewBox="0 0 200 200" className="size-56" role="img" aria-label={`${received} of ${ordered} received, ${bad} damaged, ${missing} missing.`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="16" />
        {segments.map((segment) => {
          const length = part(segment.count);
          const circle = (
            <motion.circle
              key={segment.key}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={segment.color}
              strokeWidth="16"
              transform="rotate(-90 100 100)"
              initial={false}
              animate={{ strokeDasharray: `${length} ${C - length}`, strokeDashoffset: -offset }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          );
          offset += length;
          return circle;
        })}
        <text x="100" y="98" textAnchor="middle" className="font-display" fontSize="38" fontWeight="600" fill="var(--foreground)">
          {received}
        </text>
        <text x="100" y="122" textAnchor="middle" fontSize="12" fill="var(--muted)">
          of {ordered} received
        </text>
      </svg>
      <ul className="mt-3 grid w-full grid-cols-3 gap-2 text-center text-xs">
        {segments.map((segment) => (
          <li key={segment.key} className="rounded-lg border border-line p-2">
            <span className="font-display block text-xl font-semibold tabular-nums" style={{ color: segment.color }}>
              {segment.count}
            </span>
            <span className="text-muted">{segment.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InspectScene(props: SceneProps) {
  if (viewerParty(props.deal) === "seller") return <SellerWaits {...props} />;
  return <BuyerInspects {...props} />;
}

function SellerWaits({ deal, busy }: SceneProps) {
  return (
    <>
      <Reveal className="rounded-2xl border border-coral/30 bg-surface/90 p-6 backdrop-blur sm:p-8">
        <h2 className="font-display text-2xl font-semibold">Delivered. The buyer is counting.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {deal.buyer_name} checks the {deal.quantity} × {deal.product} that arrived. If anything is missing or damaged,
          the Judge suggests a refund and you decide whether to send it.
        </p>
        <Waiting who={`${deal.buyer_name} to inspect`} className="mt-5" />
      </Reveal>
      <EvidenceList deal={deal} />
      <TrackingCard deal={deal} busy={busy} onUpdate={() => undefined} />
      <ActivityCard deal={deal} />
    </>
  );
}

function BuyerInspects({ deal, busy, post }: SceneProps) {
  const [received, setReceived] = useState(deal.quantity);
  const [damaged, setDamaged] = useState(0);
  const affected = Math.max(deal.quantity - received, 0) + Math.min(damaged, received);
  const estimate = Math.min(affected * (deal.unit_price_cents ?? 0), deal.balance_cents ?? 0);

  const track = (event: FormEvent<HTMLDivElement>) => {
    const input = event.target as HTMLInputElement;
    const value = Math.max(Number.parseInt(input.value, 10) || 0, 0);
    if (input.name === "received_quantity") setReceived(value);
    if (input.name === "damaged_quantity") setDamaged(value);
  };

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Reveal className="rounded-2xl border border-coral/30 bg-surface/90 p-6 backdrop-blur">
          <h3 className="font-display text-lg font-semibold">Counting station</h3>
          <p className="mt-1 text-sm text-muted">Updates as you type the counts.</p>
          <div className="mt-5">
            <CountDial ordered={deal.quantity} received={received} damaged={damaged} />
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-line p-4 text-sm">
            {affected === 0 ? (
              <p className="text-mint">Everything arrived in good condition. Submitting closes the deal.</p>
            ) : (
              <p>
                {affected} affected {affected === 1 ? "unit" : "units"}. The Judge will review a refund of up to{" "}
                <span className="font-semibold text-coral">{money(estimate)}</span>.
              </p>
            )}
            {deal.watcher?.missed_deadline && (
              <p className="mt-2 text-saffron">The shipment arrived after your deadline. Mention it in the notes.</p>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="rounded-2xl border border-line border-t-2 border-t-coral bg-surface/90 p-6 backdrop-blur sm:p-7">
          <h2 className="font-display text-2xl font-semibold">Inspect the goods</h2>
          <p className="mt-1 text-sm text-muted">
            Count what arrived from {deal.seller_name}. Add photos of anything damaged.
          </p>
          <div onInput={track}>
            <InspectionForm quantity={deal.quantity} busy={busy} onSubmit={(data) => post("/inspection", data)} />
          </div>
        </Reveal>
      </div>
      <EvidenceList deal={deal} />
      <TrackingCard deal={deal} busy={busy} onUpdate={() => undefined} />
      <ActivityCard deal={deal} />
    </>
  );
}
