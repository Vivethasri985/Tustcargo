"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/lib/api";
import type { Deal } from "@/types";

const STAGES: Record<string, { label: string; color: string }> = {
  shipment: { label: "Shipping proof", color: "var(--saffron)" },
  claim: { label: "Delivery photos", color: "var(--coral)" },
};

function size(bytes?: number | null): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

export function EvidenceList({ deal }: { deal: Deal }) {
  if (deal.evidence.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardTitle>Evidence files</CardTitle>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deal.evidence.map((item, index) => {
          const stage = STAGES[item.stage] ?? { label: item.stage, color: "var(--muted)" };
          const label = `${stage.label}: ${item.original_name}`;
          const href = item.url ? `${API_URL}${item.url}` : undefined;
          const image = href && item.content_type?.startsWith("image/");
          const tile = (
            <>
              <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-background/70">
                {image ? (
                  // Evidence is served by the API with its own content type.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={href} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <FileText className="size-8" style={{ color: stage.color }} aria-hidden />
                )}
              </span>
              <span className="mt-2 block wrap-anywhere text-xs leading-5">{label}</span>
              {item.size_bytes ? <span className="block text-[11px] text-muted">{size(item.size_bytes)}</span> : null}
            </>
          );
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06 }}
              className="min-w-0 rounded-xl border border-line p-2"
              style={{ borderTopColor: stage.color, borderTopWidth: 2 }}
            >
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="group block rounded-lg">
                  {tile}
                </a>
              ) : (
                tile
              )}
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
