import type { Deal, Party } from "@/types";

export type StageKey =
  | "negotiate"
  | "approve"
  | "deposit"
  | "ship"
  | "balance"
  | "track"
  | "inspect"
  | "settled"
  | "no_deal"
  | "invite"
  | "declined";

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
    summary: "Once the invited partner joins, buyer and seller agents bargain inside each person's private limit.",
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
  label: "Talks ended",
  color: "var(--coral)",
  actor: "You, with new limits",
  summary: "The limits didn't overlap, so no money moved. Try new limits.",
};

export const INVITE_STAGE: Stage = {
  key: "invite",
  step: 1,
  label: "Invitation",
  color: "var(--orchid)",
  actor: "The invited partner",
  summary: "One side has set its private limit. The AI agents bargain once the other side joins with theirs.",
};

export const DECLINED_STAGE: Stage = {
  key: "declined",
  step: 1,
  label: "Invitation declined",
  color: "var(--coral)",
  actor: "You, with another partner",
  summary: "The partner said no before any bargaining. Nothing was shared and no money moved.",
};

export function stageFor(deal: Pick<Deal, "status" | "delivered">): Stage {
  const byKey = (key: StageKey) => STAGES.find((stage) => stage.key === key)!;
  switch (deal.status) {
    case "invited":
      return INVITE_STAGE;
    case "declined":
      return DECLINED_STAGE;
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

export const PARTY_LABEL: Record<Party, string> = { buyer: "Buyer", seller: "Seller" };

/** The other person's name, or their email while the invitation is open. */
export function partnerName(deal: Deal): string {
  const role = deal.viewer_role === "invitee" ? deal.creator_role : deal.viewer_role === "buyer" ? "seller" : "buyer";
  const name = role === "buyer" ? deal.buyer_name : deal.seller_name;
  return name || deal.invite_email || "your partner";
}

/** The viewer's side of the deal. An invitee joins as the opposite of the creator. */
export function viewerParty(deal: Deal): Party {
  if (deal.viewer_role === "invitee") return deal.creator_role === "buyer" ? "seller" : "buyer";
  return deal.viewer_role;
}

/** Whether the viewer has something to do right now. */
export function isMyTurn(deal: Deal): boolean {
  if (!deal.next_actor) return false;
  if (deal.next_actor === "both") {
    if (deal.status === "negotiated") {
      return viewerParty(deal) === "buyer" ? !deal.buyer_approved : !deal.seller_approved;
    }
    return true;
  }
  return deal.next_actor === viewerParty(deal);
}

/** A short "whose move" line for banners and lists. */
export function turnLabel(deal: Deal): string {
  if (!deal.next_actor) return deal.status === "invited" ? "" : "Nothing left to do";
  if (isMyTurn(deal)) return "You";
  return partnerName(deal);
}
