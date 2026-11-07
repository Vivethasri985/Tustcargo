"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, RotateCcw, Ship } from "lucide-react";
import { StatusBadge } from "@/components/deal/status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { money } from "@/lib/format";
import type { Deal } from "@/types";

export function DealList() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    setDeals(null);
    apiFetch<Deal[]>("/deals")
      .then((result) => { if (active) setDeals(result); })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "The deals couldn't be loaded.");
      });
    return () => { active = false; };
  }, [retry]);

  if (error) return (
    <div className="mt-6 rounded-2xl border border-warning/20 bg-warning-soft p-5">
      <p role="alert">{error}</p>
      <Button className="mt-3" onClick={() => setRetry((value) => value + 1)}>Retry loading deals</Button>
    </div>
  );
  if (!deals) return <LoaderCircle className="mt-6 size-6 animate-spin" aria-label="Loading" />;

  const refresh = (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">{deals.length} {deals.length === 1 ? "deal" : "deals"}</p>
      <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
        <RotateCcw className="size-4" aria-hidden />
        Refresh deals
      </Button>
    </div>
  );

  if (deals.length === 0) {
    return (
      <>
        {refresh}
        <Card className="mt-3 py-10 text-center">
          <Ship className="mx-auto mb-4 size-8 text-accent/70" strokeWidth={1.3} aria-hidden />
          <p className="text-foreground/70">No deals yet.</p>
          <ButtonLink href="/deals/new" className="mt-4">Start a deal</ButtonLink>
        </Card>
      </>
    );
  }

  return (
    <>
      {refresh}
      <ul className="mt-3 grid gap-3">
        {deals.map((deal) => (
          <li key={deal.id}>
            <Link href={`/deals/${deal.id}`} className="group block rounded-lg">
              <Card className="flex flex-wrap items-center justify-between gap-4 transition-colors group-hover:border-accent/40 group-hover:bg-accent-soft/30">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="min-w-0 wrap-anywhere">
                    <p className="mb-1 text-xs text-muted">Deal #{deal.id}</p>
                    <p className="font-semibold">
                      {deal.quantity} × {deal.product}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {deal.seller_name} → {deal.buyer_name} · {money(deal.total_cents)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={deal.status} refundStatus={deal.refund_status} />
                  <ArrowRight className="size-4 shrink-0 text-accent" aria-hidden />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
