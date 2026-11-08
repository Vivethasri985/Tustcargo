"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CircleCheck, Clock, PackageCheck, Ship, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Deal, WatcherReport } from "@/types";

const LEVELS: Record<
  WatcherReport["level"],
  { label: string; icon: typeof Clock; tone: "neutral" | "success" | "warning" }
> = {
  on_track: { label: "On track", icon: CircleCheck, tone: "success" },
  at_risk: { label: "Delayed", icon: Clock, tone: "warning" },
  late: { label: "Late", icon: AlertTriangle, tone: "warning" },
  delivered: { label: "Delivered", icon: PackageCheck, tone: "success" },
};

const STOPS = ["Pickup", "Origin port", "At sea", "Arrival port", "Customs", "Out for delivery", "Delivered"];

function RouteStrip({ deal, featured = false }: { deal: Deal; featured?: boolean }) {
  const reached = Math.max(
    0,
    ...deal.events.filter((event) => event.kind === "update").map((event) => event.stage),
  );
  const delayedAt = new Set(deal.events.filter((event) => event.kind === "delay").map((event) => event.stage));
  const position = (reached / (STOPS.length - 1)) * 100;

  return (
    <div className={cn("mt-5 rounded-xl border border-line px-4 pt-8 pb-4", featured ? "sea px-6 pt-14 pb-6" : "bg-background/50")}>
      <div className={cn("relative mx-2 rounded-full bg-line", featured ? "h-2.5" : "h-1.5")}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-saffron via-ocean to-mint"
          initial={{ width: 0 }}
          animate={{ width: `${position}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {STOPS.map((stop, index) => (
          <span
            key={stop}
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
              featured ? "size-4.5" : "size-3",
              index <= reached ? "border-ocean bg-ocean" : "border-line bg-surface",
              delayedAt.has(index) && "border-coral bg-coral",
            )}
            style={{ left: `${(index / (STOPS.length - 1)) * 100}%` }}
            aria-hidden
          />
        ))}
        <motion.span
          className={cn("absolute -translate-x-1/2 text-ocean", featured ? "-top-12" : "-top-7")}
          initial={{ left: "0%" }}
          animate={{ left: `${position}%`, y: deal.delivered ? 0 : [0, -3, 0] }}
          transition={{ left: { duration: 1, ease: [0.22, 1, 0.36, 1] }, y: { duration: 2, repeat: Infinity } }}
          aria-hidden
        >
          <Ship className={featured ? "size-9" : "size-5"} />
        </motion.span>
      </div>
      <ol className={cn("mt-4 hidden grid-cols-7 text-center text-muted sm:grid", featured ? "text-xs" : "text-[11px]")} aria-label="Route stops">
        {STOPS.map((stop, index) => (
          <li key={stop} className={cn(index === reached && "font-medium text-foreground", delayedAt.has(index) && "text-coral")}>
            {stop}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-center text-xs text-muted sm:hidden">
        Now: <span className="text-foreground">{STOPS[reached]}</span>
      </p>
    </div>
  );
}

export interface TrackingUpdate {
  kind: "milestone" | "delay";
  delay_days?: number;
  note?: string;
}

export function TrackingCard({
  deal,
  busy,
  onUpdate,
  featured = false,
  canUpdate: allowed = false,
}: {
  deal: Deal;
  busy: boolean;
  canUpdate?: boolean;
  onUpdate: (update: TrackingUpdate) => void;
  featured?: boolean;
}) {
  const [note, setNote] = useState("");
  const [delayDays, setDelayDays] = useState("3");
  const report = deal.watcher;
  if (!report || deal.events.length === 0) return null;

  const level = LEVELS[report.level];
  const LevelIcon = level.icon;
  const canUpdate =
    allowed && !deal.delivered && ["shipment_verified", "balance_paid"].includes(deal.status);

  const send = (update: TrackingUpdate) => {
    onUpdate({ ...update, note: note.trim() });
    setNote("");
  };

  const reportDelay = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send({ kind: "delay", delay_days: Number(delayDays) });
  };

  return (
    <Card className="mt-6 border-t-2 border-t-ocean">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Watcher agent</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge tone={level.tone}>
            <LevelIcon className="mr-1 size-3.5" aria-hidden />
            {level.label}
          </Badge>
          <Badge>{report.mode === "ai" ? "Groq AI watcher" : "Rule-based fallback"}</Badge>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {deal.carrier} {deal.tracking_number}
      </p>

      <RouteStrip deal={deal} featured={featured} />

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <ol className="grid content-start gap-3">
          {deal.events.map((event, index) => (
            <motion.li
              key={`${event.stage}-${event.kind}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 text-sm"
            >
              {event.kind === "delay" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              ) : (
                <Truck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              )}
              <div className="min-w-0 wrap-anywhere">
                <p className="font-medium">
                  Day {event.day}: {event.title}
                </p>
                <p className="text-muted">{event.location}</p>
                {event.note && <p className="mt-0.5 text-muted">Note: {event.note}</p>}
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="grid content-start gap-3 text-sm">
          <p className="font-medium">{report.summary}</p>
          <dl className="grid gap-1">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Agreed delivery</dt>
              <dd>Day {report.agreed_day}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{deal.delivered ? "Delivered" : "Expected delivery"}</dt>
              <dd className={report.missed_deadline ? "font-semibold text-warning" : undefined}>
                Day {report.projected_day}
                {report.missed_deadline && " (after deadline)"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Buyer&apos;s deadline</dt>
              <dd>Day {report.deadline_day}</dd>
            </div>
          </dl>
          <p>
            <span className="font-medium">To buyer: </span>
            {report.buyer_message}
          </p>
          <p>
            <span className="font-medium">To seller: </span>
            {report.seller_message}
          </p>
          <p>
            <span className="font-medium">Suggested action: </span>
            {report.action}
          </p>
        </div>
      </div>

      {canUpdate && (
        <div className="mt-5 grid gap-4 border-t border-line pt-4">
          <p className="text-sm font-medium">Add a shipment update from your carrier</p>
          <Field label="Note (optional)">
            <Input
              value={note}
              maxLength={300}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="For example, held for customs paperwork"
            />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            {report.next_milestone && (
              <Button disabled={busy} onClick={() => send({ kind: "milestone" })}>
                <Truck className="size-4" aria-hidden />
                Record: {report.next_milestone}
              </Button>
            )}
            <form onSubmit={reportDelay} className="flex flex-wrap items-end gap-3">
              <Field label="Delay (days)">
                <Input
                  type="number"
                  min={1}
                  max={14}
                  step={1}
                  required
                  value={delayDays}
                  disabled={busy}
                  onChange={(event) => setDelayDays(event.target.value)}
                  className="w-24"
                />
              </Field>
              <Button type="submit" variant="outline" disabled={busy}>
                <Clock className="size-4" aria-hidden />
                Report delay
              </Button>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
