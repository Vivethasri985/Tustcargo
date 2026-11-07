"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bot, CreditCard, Ship } from "lucide-react";

const LANE = "M 40 250 C 140 120, 260 300, 380 170 S 560 60, 620 110";

export function SeaLane() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-[66/36] w-full max-w-3xl" aria-hidden>
      <svg viewBox="0 0 660 360" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="lane" x1="0" x2="1">
            <stop offset="0" stopColor="var(--saffron)" />
            <stop offset="0.55" stopColor="var(--ocean)" />
            <stop offset="1" stopColor="var(--mint)" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((ring) => (
          <motion.circle
            key={ring}
            cx="330"
            cy="180"
            r={120 + ring * 50}
            fill="none"
            stroke="var(--line)"
            strokeDasharray="2 10"
            animate={reduceMotion ? undefined : { rotate: ring % 2 ? -360 : 360 }}
            transition={{ duration: 90 + ring * 30, repeat: Infinity, ease: "linear" }}
            style={{ originX: "330px", originY: "180px" }}
          />
        ))}
        <motion.path
          d={LANE}
          fill="none"
          stroke="url(#lane)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="1 14"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
        <circle cx="40" cy="250" r="10" fill="var(--saffron)" />
        <circle cx="40" cy="250" r="22" fill="var(--saffron)" fillOpacity="0.15" />
        <circle cx="620" cy="110" r="10" fill="var(--mint)" />
        <circle cx="620" cy="110" r="22" fill="var(--mint)" fillOpacity="0.15" />
        <g>
          <circle r="18" fill="var(--ocean)" />
          <path d="M-8 2 L8 2 L5 7 L-5 7 Z M-1 -9 L-1 2 M-1 -9 L6 -2 L-1 -2" fill="none" stroke="var(--background)" strokeWidth="2" strokeLinejoin="round" />
          {!reduceMotion && <animateMotion dur="9s" repeatCount="indefinite" path={LANE} rotate="0" />}
          {reduceMotion && <animateMotion dur="0.01s" fill="freeze" path={LANE} keyPoints="0.55;0.55" keyTimes="0;1" calcMode="linear" />}
        </g>
      </svg>
      <motion.div
        className="absolute left-[8%] top-[10%] flex items-center gap-2 rounded-xl border border-orchid/30 bg-surface/90 px-3 py-2 text-xs backdrop-blur"
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
        transition={{ delay: 1, scale: { type: "spring", stiffness: 300, damping: 16, delay: 1 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
      >
        <Bot className="size-4 text-orchid" />
        Agents agree at $22.00
      </motion.div>
      <motion.div
        className="absolute bottom-[6%] right-[6%] flex items-center gap-2 rounded-xl border border-paypal/30 bg-surface/90 px-3 py-2 text-xs backdrop-blur"
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
        transition={{ delay: 1.6, scale: { type: "spring", stiffness: 300, damping: 16, delay: 1.6 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.6 } }}
      >
        <CreditCard className="size-4 text-paypal" />
        PayPal deposit received
      </motion.div>
      <motion.div
        className="absolute right-[30%] top-[2%] flex items-center gap-2 rounded-xl border border-ocean/30 bg-surface/90 px-3 py-2 text-xs backdrop-blur"
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
        transition={{ delay: 2.2, scale: { type: "spring", stiffness: 300, damping: 16, delay: 2.2 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.2 } }}
      >
        <Ship className="size-4 text-ocean" />
        Cleared customs
      </motion.div>
    </div>
  );
}
