"use client";

import { motion } from "framer-motion";
import { STAGE_ICONS } from "@/components/deal/stage-icon";
import { STAGES } from "@/lib/stages";

export function StageRibbon() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((stage, index) => {
        const Icon = STAGE_ICONS[stage.key];
        return (
          <motion.li
            key={stage.key}
            initial={{ opacity: 0, y: 26, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 220, damping: 20, delay: (index % 4) * 0.08 }}
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-xl border border-line bg-surface/85 p-5 backdrop-blur-sm"
            style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
          >
            <span
              className="absolute -right-6 -top-6 size-24 rounded-full blur-2xl"
              style={{ background: `color-mix(in srgb, ${stage.color} 30%, transparent)` }}
              aria-hidden
            />
            <div className="relative flex items-center justify-between">
              <Icon className="size-6" style={{ color: stage.color }} aria-hidden />
              <span className="font-display text-3xl font-semibold text-foreground/15">{stage.step}</span>
            </div>
            <h3 className="font-display relative mt-4 text-lg font-semibold">{stage.label}</h3>
            <p className="relative mt-1 text-sm leading-6 text-muted">{stage.summary}</p>
          </motion.li>
        );
      })}
    </ol>
  );
}
