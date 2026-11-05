import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/format";
import type { Deal } from "@/types";

export function NegotiationCard({ deal }: { deal: Deal }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>AI negotiation</CardTitle>
        <Badge>{deal.ai_mode === "claude" ? "Claude agents" : "Rule-based demo mode"}</Badge>
      </div>
      <ul className="mt-4 grid gap-3">
        {deal.transcript.map((line, index) => (
          <li key={index} className="text-sm">
            <span className="font-semibold capitalize">{line.party}</span>
            {line.offer_cents > 0 && <span> ({money(line.offer_cents)})</span>}
            <p className="text-foreground/70">{line.message}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
