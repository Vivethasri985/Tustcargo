import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/format";
import type { Deal } from "@/types";

export function NegotiationCard({ deal }: { deal: Deal }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>AI negotiation</CardTitle>
        <Badge>{deal.ai_mode === "ai" ? "Groq AI agents" : "Rule-based demo mode"}</Badge>
      </div>
      <ul className="mt-4 grid gap-3">
        {deal.transcript.map((line, index) => (
          <li key={index} className="text-sm">
            {line.round && line.party !== "system" && (
              <span className="mr-2 text-xs text-foreground/60">Round {line.round}</span>
            )}
            <span className="font-semibold capitalize">{line.party}</span>
            {line.offer_cents > 0 && <span> ({money(line.offer_cents)})</span>}
            <p className="text-foreground/70">{line.message}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
