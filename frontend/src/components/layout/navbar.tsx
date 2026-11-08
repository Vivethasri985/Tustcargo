"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Ship } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";
}

function Account() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  if (loading) return <span className="h-9 w-24" aria-hidden />;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {user ? (
        <motion.div
          key="user"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2"
        >
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3 text-sm">
            <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-ocean to-orchid text-xs font-semibold text-background">
              {initials(user.name)}
            </span>
            <span className="max-w-36 truncate" title={user.email}>{user.business_name || user.name}</span>
          </span>
          <button
            type="button"
            onClick={async () => { await logout(); router.push("/login"); }}
            className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-coral/15 hover:text-coral"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </motion.div>
      ) : (
        <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-sm font-medium">
          <Link href="/login" className="rounded-md px-3 py-2.5 text-muted hover:text-foreground">Log in</Link>
          <Link href="/signup" className="rounded-md bg-gradient-to-r from-saffron to-coral px-3.5 py-2 text-background">Sign up</Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/75 backdrop-blur-md">
      <nav className="mx-auto flex min-h-18 max-w-[110rem] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-14">
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
        <div className="flex flex-wrap items-center gap-3">
          <Suspense fallback={<NavLinks pathname={null} />}>
            <ActiveNavLinks />
          </Suspense>
          <Account />
        </div>
      </nav>
    </header>
  );
}
