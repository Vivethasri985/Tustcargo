"use client";

import { motion } from "framer-motion";
import { EyeOff, Handshake, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Handshake, color: "var(--saffron)", title: "Two real people", text: "A seller and a buyer each sign in and act only on their own steps." },
  { icon: EyeOff, color: "var(--orchid)", title: "Private limits", text: "Your lowest or highest price is seen only by you and your AI agent." },
  { icon: ShieldCheck, color: "var(--paypal)", title: "PayPal holds the money trail", text: "Deposit, balance and any refund go through PayPal with receipts." },
];

export function AuthShowcase() {
  return (
    <div className="hidden lg:block">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl"
      >
        Trade across borders
        <br />
        <span className="bg-gradient-to-r from-saffron via-coral to-ocean bg-clip-text text-transparent">without the guesswork.</span>
      </motion.p>
      <ul className="mt-10 grid max-w-lg gap-4">
        {POINTS.map(({ icon: Icon, color, title, text }, index) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ x: 4 }}
            className="flex gap-4 rounded-xl border border-line bg-surface/60 p-4 backdrop-blur"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-medium">{title}</span>
              <span className="text-sm leading-6 text-muted">{text}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
