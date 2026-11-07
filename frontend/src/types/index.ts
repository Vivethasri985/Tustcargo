export type DealStatus =
  | "negotiated"
  | "no_deal"
  | "approved"
  | "deposit_paid"
  | "proof_review"
  | "shipment_verified"
  | "balance_paid"
  | "refund_suggested"
  | "refunded"
  | "claim_rejected"
  | "closed";

export interface TranscriptLine {
  party: "buyer" | "seller" | "system";
  offer_cents: number;
  message: string;
  round?: number;
}

export interface ShipmentEvent {
  stage: number;
  kind: "update" | "delay";
  title: string;
  location: string;
  day: number;
  note?: string | null;
}

export interface Activity {
  actor: "buyer" | "seller" | "carrier" | "paypal" | "ai" | "system";
  message: string;
  created_at: string;
}

export interface WatcherReport {
  level: "on_track" | "at_risk" | "late" | "delivered";
  agreed_day: number;
  projected_day: number;
  deadline_day: number;
  delay_days: number;
  missed_deadline: boolean;
  next_milestone?: string | null;
  summary: string;
  buyer_message: string;
  seller_message: string;
  action: string;
  mode: "ai" | "rule_based";
}

export interface Payment {
  kind: "deposit" | "balance";
  amount_cents: number;
  order_id: string;
  capture_id: string | null;
  status: string;
}

export interface Evidence {
  id: number;
  stage: string;
  original_name: string;
  content_type?: string;
  size_bytes?: number | null;
  url?: string;
}

export interface Verification {
  matches: boolean;
  summary: string;
  issues: string[];
  mode: "ai" | "rule_based";
}

export interface Claim {
  reasoning: string;
  mode: "ai" | "rule_based";
}

export interface Deal {
  id: number;
  reference?: string | null;
  created_at?: string;
  product: string;
  quantity: number;
  buyer_name: string;
  buyer_country: string;
  seller_name: string;
  seller_country: string;
  deposit_percent: number;
  status: DealStatus;
  ai_mode: "ai" | "rule_based";
  unit_price_cents: number | null;
  delivery_days: number | null;
  total_cents: number | null;
  deposit_cents: number | null;
  balance_cents: number | null;
  transcript: TranscriptLine[];
  buyer_approved: boolean;
  seller_approved: boolean;
  carrier: string | null;
  tracking_number: string | null;
  shipped_quantity: number | null;
  verification: Verification | null;
  tracking_added: boolean;
  delay_days: number;
  delivered: boolean;
  watcher: WatcherReport | null;
  events: ShipmentEvent[];
  buyer_deadline_days: number;
  buyer_max_cents?: number;
  seller_min_cents?: number;
  seller_lead_days?: number;
  received_quantity: number | null;
  damaged_quantity: number | null;
  inspection_notes: string | null;
  claim: Claim | null;
  refund_suggested_cents: number | null;
  refund_id: string | null;
  refund_status: string | null;
  payments: Payment[];
  evidence: Evidence[];
  activity?: Activity[];
}

export interface Supplier {
  seller_name: string;
  seller_country: string;
  product: string;
  seller_min_cents: number;
  seller_lead_days: number;
}
