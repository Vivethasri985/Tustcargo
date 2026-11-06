import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  return (
    <ol aria-label="Deal progress" className="my-8 grid grid-cols-4 gap-y-5 rounded-lg border border-line bg-surface px-2 py-6 sm:grid-cols-7 sm:px-4">
      {STEPS.map((step, index) => {
        const done = index < active;
        return (
          <li key={step} aria-current={index === active ? "step" : undefined} className="relative grid justify-items-center gap-2 text-center text-[11px] font-medium text-muted">
            {index < STEPS.length - 1 && <span className="absolute left-[calc(50%+1.1rem)] top-4 hidden h-px w-[calc(100%-2.2rem)] bg-line sm:block" aria-hidden />}
            <motion.span
              initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : index * 0.04 }}
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full border border-line bg-background font-mono text-xs",
                done && "border-accent/20 bg-accent-soft text-accent",
                index === active && "border-accent bg-accent text-surface ring-4 ring-accent/10",
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
