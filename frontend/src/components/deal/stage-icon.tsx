import {
  BadgeCheck,
  Banknote,
  ClipboardCheck,
  Handshake,
  MailOpen,
  MailX,
  MessagesSquare,
  PackageCheck,
  Ship,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { StageKey } from "@/lib/stages";

export const STAGE_ICONS: Record<StageKey, LucideIcon> = {
  negotiate: MessagesSquare,
  approve: Handshake,
  deposit: Wallet,
  ship: PackageCheck,
  balance: Banknote,
  track: Ship,
  inspect: ClipboardCheck,
  settled: BadgeCheck,
  no_deal: XCircle,
  invite: MailOpen,
  declined: MailX,
};
