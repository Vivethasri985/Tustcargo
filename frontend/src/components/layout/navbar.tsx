"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deals/new", label: "New deal" },
  { href: "/guide", label: "How it works" },
];

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== null && (href === "/deals/new" ? pathname === href : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2.5 transition-colors",
              active ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 -z-10 rounded-md bg-accent-soft"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/75 backdrop-blur-md">
      <nav className="mx-auto flex min-h-18 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5 rounded-md font-display text-xl font-semibold tracking-tight">
          <motion.span
            className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-saffron via-coral to-ocean text-background"
            whileHover={{ rotate: -8, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Ship className="size-5" strokeWidth={2} aria-hidden />
          </motion.span>
          TrustCargo
        </Link>
        <Suspense fallback={<NavLinks pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </nav>
    </header>
  );
}
