export type DealStatus =
  | "draft"
  | "approved"
  | "deposit_paid"
  | "shipped"
  | "balance_paid"
  | "delivered"
  | "claim_open"
  | "refunded"
  | "closed";

export interface Deal {
  id: number;
  title: string;
  status: DealStatus;
}
