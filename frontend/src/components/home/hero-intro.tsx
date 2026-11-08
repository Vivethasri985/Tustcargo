"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ButtonLink } from "@/components/ui/button";

const TITLE = "Cross-border trade you can trust";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const word: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.92, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

const pop: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 240, damping: 22 } },
};

export function HeroIntro() {
  const { user, loading } = useAuth();
  const guest = !loading && !user;
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <h1 className="font-display max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl xl:text-8xl">
        {TITLE.split(" ").map((part, index, all) => (
          <motion.span key={index} variants={word} className="inline-block">
            {part}
            {index < all.length - 1 ? "\u00a0" : ""}
          </motion.span>
        ))}
      </h1>
      <motion.p variants={pop} className="mt-6 max-w-xl text-lg leading-8 text-muted">
        A seller and a buyer each sign in. Their AI agents negotiate inside private limits and check the
        evidence, both people approve, and PayPal handles each payment and refund.
      </motion.p>
      <motion.div variants={pop} className="mt-9 flex flex-wrap items-center gap-3">
        <ButtonLink href={guest ? "/signup" : "/deals/new"} className="px-6">
          {guest ? "Create an account" : "Start a deal"} <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
        <ButtonLink href={guest ? "/login" : "/dashboard"} variant="outline" className="px-6">
          {guest ? "Log in" : "View dashboard"}
        </ButtonLink>
        <ButtonLink href="/guide" variant="outline" className="px-6">
          <BookOpen className="size-4" aria-hidden /> How it works
        </ButtonLink>
      </motion.div>
    </motion.div>
  );
}
