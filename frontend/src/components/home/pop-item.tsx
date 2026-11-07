"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** A list item that pops in once when it scrolls into view. */
export function PopItem({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 220, damping: 20, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className={className}
    >
      {children}
    </motion.li>
  );
}
