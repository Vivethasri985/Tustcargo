import type { DealStatus } from "@/types";

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export const STATUS_LABELS: Record<DealStatus, string> = {
  invited: "Invitation sent",
  declined: "Invitation declined",
  negotiated: "Waiting for approval",
  no_deal: "No deal",
  approved: "Deposit due",
  deposit_paid: "Waiting for shipment",
  proof_review: "Proof needs review",
  shipment_verified: "Balance due",
  balance_paid: "Waiting for inspection",
  refund_suggested: "Refund suggested",
  refunded: "Refunded",
  claim_rejected: "Claim rejected",
  closed: "Closed",
};
