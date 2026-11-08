import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { DealRoom } from "@/components/deal/deal-room";

export default function DealDetailsPage() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <DealRoom />
      </RequireAuth>
    </Suspense>
  );
}
