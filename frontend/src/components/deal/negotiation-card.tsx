"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Deal, TranscriptLine } from "@/types";

const W = 320;
const H = 120;
const PAD = 14;

function PriceChart({ lines, final }: { lines: TranscriptLine[]; final: number | null }) {
  const offers = lines.filter((line) => line.party !== "system" && line.offer_cents > 0);
  if (offers.length < 2) return null;

  const values = offers.map((line) => line.offer_cents).concat(final ?? []);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 1);
  const x = (index: number) => PAD + (index / Math.max(offers.length - 1, 1)) * (W - PAD * 2);
  const y = (cents: number) => H - PAD - ((cents - low) / span) * (H - PAD * 2);

  const series = (party: "buyer" | "seller") =>
    offers
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.party === party)
      .map(({ line, index }) => `${x(index)},${y(line.offer_cents)}`)
      .join(" ");

  const buyer = offers.filter((line) => line.party === "buyer");
  const seller = offers.filter((line) => line.party === "seller");
  const description = `Buyer offers rose from ${money(buyer[0]?.offer_cents)} to ${money(buyer.at(-1)?.offer_cents)}. Seller offers fell from ${money(seller[0]?.offer_cents)} to ${money(seller.at(-1)?.offer_cents)}.${final ? ` Agreed at ${money(final)}.` : ""}`;

  return (
    <figure className="mt-4 rounded-xl border border-line bg-background/50 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" role="img" aria-label={description}>
        {final !== null && (
          <line x1={PAD} x2={W - PAD} y1={y(final)} y2={y(final)} stroke="var(--mint)" strokeDasharray="4 5" strokeOpacity="0.6" />
        )}
        {(["seller", "buyer"] as const).map((party) => (
          <motion.polyline
            key={party}
            points={series(party)}
            fill="none"
            stroke={party === "buyer" ? "var(--ocean)" : "var(--saffron)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        ))}
        {offers.map((line, index) => (
          <circle
            key={index}
            cx={x(index)}
            cy={y(line.offer_cents)}
            r="3.5"
            fill={line.party === "buyer" ? "var(--ocean)" : "var(--saffron)"}
          />
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="mr-1.5 inline-block size-2 rounded-full bg-ocean" />Buyer offers</span>
        <span><span className="mr-1.5 inline-block size-2 rounded-full bg-saffron" />Seller offers</span>
        {final !== null && <span><span className="mr-1.5 inline-block h-0.5 w-3 bg-mint align-middle" />Agreed price</span>}
      </figcaption>
    </figure>
  );
}

export function NegotiationCard({ deal }: { deal: Deal }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>AI negotiation</CardTitle>
        <Badge>{deal.ai_mode === "ai" ? "Groq AI agents" : "Rule-based fallback"}</Badge>
      </div>
      <PriceChart lines={deal.transcript} final={deal.unit_price_cents} />
      <ul className="mt-4 grid gap-3">
        {deal.transcript.map((line, index) => {
          const buyer = line.party === "buyer";
          const system = line.party === "system";
          return (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: system ? 0 : buyer ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.08, 0.8), duration: 0.35 }}
              className={cn("flex text-sm", system ? "justify-center" : buyer ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "wrap-anywhere max-w-[88%] rounded-2xl px-4 py-2.5 leading-6",
                  system && "border border-dashed border-line bg-background/40 text-center",
                  buyer && "rounded-bl-sm border border-ocean/25 bg-ocean/10",
                  !buyer && !system && "rounded-br-sm border border-saffron/25 bg-saffron/10",
                )}
              >
                <p className="flex flex-wrap items-center gap-x-2 text-xs">
                  {system && <Bot className="size-3.5 text-orchid" aria-hidden />}
                  <span className={cn("font-semibold capitalize", buyer ? "text-ocean" : system ? "text-orchid" : "text-saffron")}>
                    {line.party}
                  </span>
                  {line.round && !system && <span className="text-muted">Round {line.round}</span>}
                  {line.offer_cents > 0 && <span className="font-medium tabular-nums text-foreground">({money(line.offer_cents)})</span>}
                </p>
                <p className="mt-1 text-foreground/85">{line.message}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
