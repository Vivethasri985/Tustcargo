"use client";

import { motion } from "framer-motion";
import { Bot, Building2, CreditCard, Ship, Store, User, type LucideIcon } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { Activity, Deal } from "@/types";

const ACTORS: Record<Activity["actor"], { label: string; color: string; icon: LucideIcon }> = {
  buyer: { label: "Buyer", color: "var(--ocean)", icon: User },
  seller: { label: "Seller", color: "var(--saffron)", icon: Store },
  carrier: { label: "Carrier", color: "var(--ocean)", icon: Ship },
  paypal: { label: "PayPal", color: "var(--paypal)", icon: CreditCard },
  ai: { label: "AI agent", color: "var(--orchid)", icon: Bot },
  system: { label: "TrustCargo", color: "var(--mint)", icon: Building2 },
};

function time(value: string): string {
  const date = new Date(value.endsWith("Z") || value.includes("+") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityCard({ deal }: { deal: Deal }) {
  const entries = [...(deal.activity ?? [])].reverse();
  if (entries.length === 0) return null;

  const counts = entries.reduce<Record<string, number>>((total, entry) => {
    total[entry.actor] = (total[entry.actor] ?? 0) + 1;
    return total;
  }, {});

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Activity</CardTitle>
        <ul className="flex flex-wrap gap-2 text-xs" aria-label="Actions by participant">
          {Object.entries(counts).map(([actor, count]) => {
            const style = ACTORS[actor as Activity["actor"]] ?? ACTORS.system;
            return (
              <li key={actor} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1">
                <span className="size-2 rounded-full" style={{ background: style.color }} />
                {style.label} {count}
              </li>
            );
          })}
        </ul>
      </div>
      <ol className="relative mt-5 grid max-h-[28rem] gap-4 overflow-y-auto pr-1 pl-1">
        <span className="absolute top-2 bottom-2 left-[1.05rem] w-px bg-line" aria-hidden />
        {entries.map((entry, index) => {
          const style = ACTORS[entry.actor] ?? ACTORS.system;
          const Icon = style.icon;
          return (
            <motion.li
              key={`${entry.created_at}-${index}`}
              initial={index < 6 ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative grid grid-cols-[2.1rem_1fr] gap-3 text-sm"
            >
              <span
                className="relative z-10 flex size-[2.1rem] items-center justify-center rounded-full border"
                style={{
                  color: style.color,
                  borderColor: `color-mix(in srgb, ${style.color} 45%, transparent)`,
                  background: `color-mix(in srgb, ${style.color} 14%, var(--surface))`,
                }}
              >
                <Icon className="size-4" aria-hidden />
                {index === 0 && (
                  <motion.span
                    className="absolute inset-0 rounded-full border"
                    style={{ borderColor: style.color }}
                    animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    aria-hidden
                  />
                )}
              </span>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium" style={{ color: style.color }}>{style.label}</span>
                  <time className="text-xs text-muted" dateTime={entry.created_at}>
                    {time(entry.created_at)}
                  </time>
                </div>
                <p className="wrap-anywhere text-foreground/80">{entry.message}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </Card>
  );
}
