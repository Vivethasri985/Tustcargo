import { FileText, Image as ImageIcon } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/lib/api";
import type { Deal } from "@/types";

const STAGES: Record<string, string> = {
  shipment: "Shipping proof",
  claim: "Delivery photos",
};

function size(bytes?: number | null): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

export function EvidenceList({ deal }: { deal: Deal }) {
  if (deal.evidence.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardTitle>Evidence files</CardTitle>
      <ul className="mt-4 grid gap-2">
        {deal.evidence.map((item) => {
          const Icon = item.content_type === "application/pdf" ? FileText : ImageIcon;
          const label = `${STAGES[item.stage] ?? item.stage}: ${item.original_name}`;
          return (
            <li key={item.id} className="flex min-w-0 items-center gap-2 text-sm">
              <Icon className="size-4 shrink-0 text-accent" aria-hidden />
              {item.url ? (
                <a
                  href={`${API_URL}${item.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 wrap-anywhere underline decoration-line underline-offset-4 hover:decoration-accent"
                >
                  {label}
                </a>
              ) : (
                <span className="min-w-0 wrap-anywhere">{label}</span>
              )}
              {item.size_bytes ? <span className="text-xs text-muted">{size(item.size_bytes)}</span> : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
