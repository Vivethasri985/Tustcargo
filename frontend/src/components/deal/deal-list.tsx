"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { money, STATUS_LABELS } from "@/lib/format";
import type { Deal } from "@/types";

export function DealList() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Deal[]>("/deals")
      .then(setDeals)
      .catch(() => setError("Start the backend, then refresh this page."));
  }, []);

  if (error) return <p role="alert" className="mt-6">{error}</p>;
  if (!deals) return <LoaderCircle className="mt-6 size-6 animate-spin" aria-label="Loading" />;

  if (deals.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-foreground/70">No deals yet.</p>
        <Link href="/deals/new" className="mt-4 inline-block">
          <Button>Start a deal</Button>
        </Link>
      </Card>
    );
  }

  return (
    <ul className="mt-6 grid gap-3">
      {deals.map((deal) => (
        <li key={deal.id}>
          <Link href={`/deals/${deal.id}`}>
            <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-foreground/40">
              <div>
                <p className="font-semibold">
                  {deal.quantity} × {deal.product}
                </p>
                <p className="text-sm text-foreground/70">
                  {deal.seller_name} → {deal.buyer_name} · {money(deal.total_cents)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{STATUS_LABELS[deal.status]}</Badge>
                <ArrowRight className="size-4" aria-hidden />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
