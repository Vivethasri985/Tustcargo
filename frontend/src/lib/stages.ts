import type { Deal } from "@/types";

export type StageKey =
  | "negotiate"
  | "approve"
  | "deposit"
  | "ship"
  | "balance"
  | "track"
  | "inspect"
  | "settled"
  | "no_deal";

export interface Stage {
  key: StageKey;
  step: number;
  label: string;
  color: string;
  actor: string;
  summary: string;
}

export const STAGES: Stage[] = [
  {
    key: "negotiate",
    step: 1,
    label: "Negotiate",
    color: "var(--orchid)",
    actor: "AI agents",
    summary: "Buyer and seller agents bargain inside the limits each person set.",
  },
  {
    key: "approve",
    step: 2,
    label: "Approve",
    color: "var(--saffron)",
    actor: "Buyer and seller",
    summary: "Both people read the agreed terms and sign off before any money moves.",
  },
  {
    key: "deposit",
    step: 3,
    label: "Deposit",
    color: "var(--paypal)",
    actor: "Buyer, through PayPal",
    summary: "The buyer pays the deposit on PayPal so the seller can start work.",
  },
  {
    key: "ship",
    step: 4,
    label: "Ship",
    color: "var(--saffron)",
    actor: "Seller",
    summary: "The seller hands the goods to a carrier and uploads proof for the AI to check.",
  },
  {
    key: "balance",
    step: 5,
    label: "Balance",
    color: "var(--paypal)",
    actor: "Buyer, through PayPal",
    summary: "With verified proof in hand, the buyer pays the rest on PayPal.",
  },
  {
    key: "track",
    step: 6,
    label: "Track",
    color: "var(--ocean)",
    actor: "Carrier and Watcher agent",
    summary: "The carrier records each port and delay. The Watcher explains the risk.",
  },
  {
    key: "inspect",
    step: 7,
    label: "Inspect",
    color: "var(--coral)",
    actor: "Buyer, then seller",
    summary: "The buyer counts the goods. If something is wrong, the Judge suggests a refund.",
  },
  {
    key: "settled",
    step: 8,
    label: "Settled",
    color: "var(--mint)",
    actor: "Everyone",
    summary: "Money and goods are where they should be. The record stays for both sides.",
  },
];

export const NO_DEAL_STAGE: Stage = {
  key: "no_deal",
  step: 1,
  label: "No deal",
  color: "var(--coral)",
  actor: "AI agents",
  summary: "The limits didn't overlap, so no money moved. Try new limits.",
};

export function stageFor(deal: Pick<Deal, "status" | "delivered">): Stage {
  const byKey = (key: StageKey) => STAGES.find((stage) => stage.key === key)!;
  switch (deal.status) {
    case "no_deal":
      return NO_DEAL_STAGE;
    case "negotiated":
      return byKey("approve");
    case "approved":
      return byKey("deposit");
    case "deposit_paid":
    case "proof_review":
      return byKey("ship");
    case "shipment_verified":
      return byKey("balance");
    case "balance_paid":
      return deal.delivered === false ? byKey("track") : byKey("inspect");
    case "refund_suggested":
      return byKey("inspect");
    default:
      return byKey("settled");
  }
}

export function stageIndex(deal: Pick<Deal, "status" | "delivered">): number {
  const stage = stageFor(deal);
  if (stage.key === "settled") return STAGES.length;
  return stage.step - 1;
}
