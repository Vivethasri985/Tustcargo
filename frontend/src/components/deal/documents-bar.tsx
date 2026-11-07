"use client";

import { motion } from "framer-motion";
import { Download, FileCheck2, FileSignature, FileText, ReceiptText, RotateCcw } from "lucide-react";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Deal, DealDocument } from "@/types";

const LOOK: Record<DealDocument["kind"], { icon: typeof FileText; color: string }> = {
  agreement: { icon: FileSignature, color: "var(--saffron)" },
  deposit: { icon: ReceiptText, color: "var(--paypal)" },
  balance: { icon: ReceiptText, color: "var(--mint)" },
  refund: { icon: RotateCcw, color: "var(--coral)" },
  statement: { icon: FileCheck2, color: "var(--mint)" },
};

export function documentHref(doc: DealDocument) {
  return `${API_URL}${doc.url}`;
}

export function findDocument(deal: Deal, kind: DealDocument["kind"]) {
  return deal.documents?.find((doc) => doc.kind === kind);
}

/** A download button for one bill, used inside each step's layout. */
export function DocumentButton({ doc, className, ink }: { doc?: DealDocument; className?: string; ink?: string }) {
  if (!doc) return null;
  const color = ink ?? LOOK[doc.kind].color;
  return (
    <motion.a
      href={documentHref(doc)}
      download
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
        className,
      )}
      style={{ borderColor: `color-mix(in srgb, ${color} 55%, transparent)`, color }}
    >
      <Download className="size-4" aria-hidden />
      Download {doc.title.toLowerCase()}
    </motion.a>
  );
}

/** Every bill the deal has reached so far. */
export function DocumentsBar({ deal }: { deal: Deal }) {
  const docs = deal.documents ?? [];
  if (docs.length === 0) return null;

  return (
    <section aria-label="Documents" className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/80 p-3 backdrop-blur">
      <p className="px-2 text-sm font-medium text-muted">Bills and documents</p>
      {docs.map((doc, index) => {
        const { icon: Icon, color } = LOOK[doc.kind];
        return (
          <motion.a
            key={doc.kind}
            href={documentHref(doc)}
            download
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ y: -2 }}
            className="group inline-flex items-center gap-2 rounded-lg border border-line bg-background/60 px-3 py-2 text-sm transition-colors hover:bg-surface"
          >
            <Icon className="size-4" style={{ color }} aria-hidden />
            {doc.title}
            <Download className="size-3.5 text-muted transition-transform group-hover:translate-y-0.5" aria-hidden />
            <span className="sr-only">(PDF)</span>
          </motion.a>
        );
      })}
    </section>
  );
}
