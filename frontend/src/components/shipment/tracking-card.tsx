"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CircleCheck, Clock, PackageCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Deal, WatcherReport } from "@/types";

const LEVELS: Record<WatcherReport["level"], { label: string; icon: typeof Clock }> = {
  on_track: { label: "On track", icon: CircleCheck },
  at_risk: { label: "Delayed", icon: Clock },
  late: { label: "Late", icon: AlertTriangle },
  delivered: { label: "Delivered", icon: PackageCheck },
};

export function TrackingCard({
  deal,
  busy,
  onAdvance,
  onDelay,
}: {
  deal: Deal;
  busy: boolean;
  onAdvance: () => void;
  onDelay: () => void;
}) {
  const report = deal.watcher;
  if (!report || deal.events.length === 0) return null;

  const level = LEVELS[report.level];
  const LevelIcon = level.icon;
  const canSimulate =
    !deal.delivered && ["shipment_verified", "balance_paid"].includes(deal.status);

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Watcher agent</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge className={cn(report.level === "late" && "border-foreground font-semibold")}>
            <LevelIcon className="mr-1 size-3.5" aria-hidden />
            {level.label}
          </Badge>
          <Badge>{report.mode === "ai" ? "Groq AI watcher" : "Rule-based demo mode"}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <ol className="grid gap-3">
          {deal.events.map((event, index) => (
            <motion.li
              key={`${event.stage}-${event.kind}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 text-sm"
            >
              {event.kind === "delay" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <div>
                <p className="font-medium">
                  Day {event.day}: {event.title}
                </p>
                <p className="text-foreground/70">{event.location}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="grid content-start gap-3 text-sm">
          <p className="font-medium">{report.summary}</p>
          <dl className="grid gap-1">
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/70">Agreed delivery</dt>
              <dd>Day {report.agreed_day}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/70">
                {deal.delivered ? "Delivered" : "Expected delivery"}
              </dt>
              <dd className={cn(report.missed_deadline && "font-semibold")}>
                Day {report.projected_day}
                {report.missed_deadline && " (after deadline)"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/70">Buyer's deadline</dt>
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

      {canSimulate && (
        <div className="mt-5 flex flex-wrap gap-3 border-t border-foreground/10 pt-4">
          <Button disabled={busy} onClick={onAdvance}>
            <Truck className="size-4" aria-hidden />
            Simulate next update
          </Button>
          <Button variant="outline" disabled={busy} onClick={onDelay}>
            <Clock className="size-4" aria-hidden />
            Simulate customs delay
          </Button>
          <p className="basis-full text-xs text-foreground/60">
            Demo only: these buttons stand in for live carrier updates.
          </p>
        </div>
      )}
    </Card>
  );
}
