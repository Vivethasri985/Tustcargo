import { Suspense } from "react";
import { DealRoom } from "@/components/deal/deal-room";

export default function DealDetailsPage() {
  return (
    <Suspense fallback={null}>
      <DealRoom />
    </Suspense>
  );
}
