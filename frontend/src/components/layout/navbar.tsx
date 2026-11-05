import Link from "next/link";
import { Ship } from "lucide-react";

export function Navbar() {
  return (
    <header className="relative z-10 border-b border-foreground/10">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Ship className="size-5" aria-hidden />
          TrustCargo
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/deals/new">New deal</Link>
        </div>
      </nav>
    </header>
  );
}
