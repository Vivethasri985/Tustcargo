import { Card, CardTitle } from "@/components/ui/card";
import type { Activity, Deal } from "@/types";

const ACTORS: Record<Activity["actor"], string> = {
  buyer: "Buyer",
  seller: "Seller",
  carrier: "Carrier",
  paypal: "PayPal",
  ai: "AI agent",
  system: "TrustCargo",
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

  return (
    <Card className="mt-6">
      <CardTitle>Activity</CardTitle>
      <ol className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">
        {entries.map((entry, index) => (
          <li key={index} className="grid gap-0.5 border-b border-line pb-3 text-sm last:border-0">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{ACTORS[entry.actor] ?? entry.actor}</span>
              <time className="text-xs text-muted" dateTime={entry.created_at}>
                {time(entry.created_at)}
              </time>
            </div>
            <p className="wrap-anywhere text-muted">{entry.message}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
