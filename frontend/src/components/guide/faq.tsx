"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const QUESTIONS = [
  {
    q: "Can the AI move money on its own?",
    a: "No. Agents only suggest. A person approves the deal, the buyer approves each PayPal payment, and the seller approves any refund.",
  },
  {
    q: "What if the agents can't agree on a price?",
    a: "If the seller's minimum is above the buyer's maximum, or delivery is slower than the buyer needs, the deal stops before any payment. You can start again with new limits.",
  },
  {
    q: "Can the AI go past my price limit?",
    a: "No. The limits are enforced in code, not left to the AI. The buyer agent can't offer more than the maximum, and the seller agent can't accept less than the minimum.",
  },
  {
    q: "What happens if the shipment is late?",
    a: "The Watcher compares the new arrival day with the agreed day and the buyer's deadline, then suggests what each side should do. Late delivery doesn't move money by itself.",
  },
  {
    q: "How is a refund worked out?",
    a: "The Judge looks at how many units were missing or damaged, the unit price and any photos. It can never suggest more than the affected goods are worth or more than the balance paid.",
  },
  {
    q: "Which files and tracking numbers can I use?",
    a: "Up to three JPG, PNG, WEBP or PDF files, 5 MB each. DHL numbers have 10 digits, FedEx 12 or 15, and UPS numbers start with 1Z. Other carriers need 6 to 30 letters or digits.",
  },
  {
    q: "Is this real money?",
    a: "Not in this prototype. Payments run in the PayPal sandbox with test accounts, so you can try the full flow safely.",
  },
  {
    q: "Who can see my deal?",
    a: "This prototype has no login, and buyer and seller use the same screen. Don't enter private information. A live version would add separate buyer and seller accounts.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface/90 backdrop-blur">
      {QUESTIONS.map(({ q, a }, index) => {
        const expanded = open === index;
        return (
          <li key={q}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium"
            >
              {q}
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="shrink-0 text-saffron">
                <ChevronDown className="size-5" aria-hidden />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-7 text-muted">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
