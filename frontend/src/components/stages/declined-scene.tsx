"use client";

import { motion } from "framer-motion";
import { MailX } from "lucide-react";
import { ActivityCard } from "@/components/deal/activity-card";
import { ButtonLink } from "@/components/ui/button";
import type { SceneProps } from "./scene-kit";

export function DeclinedScene({ deal }: SceneProps) {
  const mine = deal.viewer_role === "invitee";
  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid items-center gap-8 rounded-2xl border border-coral/40 bg-surface/90 p-6 backdrop-blur sm:grid-cols-[auto_1fr] sm:p-10"
      >
        <motion.span
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -8, 6, 0] }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex size-20 items-center justify-center rounded-2xl bg-coral/15 text-coral"
        >
          <MailX className="size-10" strokeWidth={1.4} aria-hidden />
        </motion.span>
        <div>
          <h2 className="font-display text-3xl font-semibold">
            {mine ? "You declined this invitation" : "The invitation was declined"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/75">
            {mine
              ? `You won't see this deal for ${deal.quantity} × ${deal.product} again. Nothing was shared and no money moved.`
              : `Your partner chose not to trade ${deal.quantity} × ${deal.product}. They never saw your limit, and no money moved.`}
          </p>
          <ButtonLink href={mine ? "/dashboard" : "/deals/new"} className="mt-5">
            {mine ? "Back to dashboard" : "Start a new deal"}
          </ButtonLink>
        </div>
      </motion.article>
      <ActivityCard deal={deal} />
    </>
  );
}
