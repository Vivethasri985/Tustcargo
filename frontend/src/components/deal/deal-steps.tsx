import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealStatus } from "@/types";

const STEPS = ["Negotiate", "Approve", "Deposit", "Ship", "Balance", "Inspect", "Settled"];

const ACTIVE_STEP: Record<DealStatus, number> = {
  no_deal: 0,
  negotiated: 1,
  approved: 2,
  deposit_paid: 3,
  proof_review: 3,
  shipment_verified: 4,
  balance_paid: 5,
  refund_suggested: 5,
  refunded: 7,
  claim_rejected: 7,
  closed: 7,
};

export function DealSteps({ status }: { status: DealStatus }) {
  const active = ACTIVE_STEP[status];

  return (
    <ol className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-7">
      {STEPS.map((step, index) => {
        const done = index < active;
        return (
          <li key={step} className="grid justify-items-center gap-1.5 text-center text-xs">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.04 }}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border border-foreground/25 font-semibold",
                done && "bg-foreground text-background",
                index === active && "ring-2 ring-foreground",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : index + 1}
            </motion.span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
