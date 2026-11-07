"use client";

import { ApproveScene } from "./approve-scene";
import { InspectScene } from "./inspect-scene";
import { NoDealScene } from "./no-deal-scene";
import { PaymentScene } from "./payment-scene";
import type { SceneProps } from "./scene-kit";
import { SettledScene } from "./settled-scene";
import { ShipScene } from "./ship-scene";
import { TrackScene } from "./track-scene";
import { VerdictScene } from "./verdict-scene";

/** Each step of a deal gets its own layout. */
export function StageScene(props: SceneProps) {
  const { deal } = props;
  switch (deal.status) {
    case "no_deal":
      return <NoDealScene {...props} />;
    case "negotiated":
      return <ApproveScene {...props} />;
    case "approved":
      return <PaymentScene {...props} kind="deposit" />;
    case "deposit_paid":
    case "proof_review":
      return <ShipScene {...props} />;
    case "shipment_verified":
      return <PaymentScene {...props} kind="balance" />;
    case "balance_paid":
      return deal.delivered ? <InspectScene {...props} /> : <TrackScene {...props} />;
    case "refund_suggested":
      return <VerdictScene {...props} />;
    default:
      return <SettledScene {...props} />;
  }
}
