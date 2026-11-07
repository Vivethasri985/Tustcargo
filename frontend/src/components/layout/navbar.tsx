import Link from "next/link";
import { Ship } from "lucide-react";

export function Navbar() {
  return (
    <header className="relative z-10 border-b border-line bg-surface/90">
      <nav className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight">
          <Ship className="size-6 text-accent" strokeWidth={1.5} aria-hidden />
          TrustCargo
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link href="/dashboard" className="rounded-lg px-3 py-2.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent">Dashboard</Link>
          <Link href="/deals/new" className="rounded-md px-3 py-2.5 text-accent transition-colors hover:bg-accent-soft">New deal</Link>
        </div>
      </nav>
    </header>
  );
}
