import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/format";
import type { DealStatus } from "@/types";

export function StatusBadge({ status, refundStatus }: { status: DealStatus; refundStatus?: string | null }) {
  if (status === "refunded" && refundStatus !== "COMPLETED") {
    return <Badge tone="warning">{refundStatus === "PENDING" ? "Refund pending" : "Refund not confirmed"}</Badge>;
  }
  const tone = ["no_deal", "proof_review", "refund_suggested", "claim_rejected"].includes(status)
    ? "warning"
    : ["shipment_verified", "refunded", "closed"].includes(status) ? "success" : "neutral";
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>;
}
