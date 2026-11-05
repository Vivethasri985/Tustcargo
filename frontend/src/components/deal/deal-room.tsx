"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, CreditCard, LoaderCircle, RotateCcw, X } from "lucide-react";
import { InspectionForm } from "@/components/claim/inspection-form";
import { DealSteps } from "@/components/deal/deal-steps";
import { NegotiationCard } from "@/components/deal/negotiation-card";
import { PaymentSummary } from "@/components/payment/payment-summary";
import { ShipmentForm } from "@/components/shipment/shipment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { money, STATUS_LABELS } from "@/lib/format";
import type { Deal } from "@/types";

export function DealRoom() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const returnHandled = useRef(false);

  const run = useCallback(async (action: () => Promise<Deal | void>) => {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result) setDeal(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind");

    if (params.get("paypal") === "return" && kind) {
      if (returnHandled.current) return;
      returnHandled.current = true;
      window.history.replaceState(null, "", `/deals/${id}`);
      run(() =>
        apiFetch<Deal>(`/deals/${id}/payments/${kind}/capture`, { method: "POST" }),
      );
      return;
    }

    if (params.get("paypal") === "cancel") {
      window.history.replaceState(null, "", `/deals/${id}`);
      setError("The PayPal payment was cancelled.");
    }
    run(() => apiFetch<Deal>(`/deals/${id}`));
  }, [id, run]);

  const post = (path: string, body?: BodyInit) =>
    run(() => apiFetch<Deal>(`/deals/${id}${path}`, { method: "POST", body }));

  const approve = (party: "buyer" | "seller") =>
    post("/approve", JSON.stringify({ party }));

  const pay = (kind: "deposit" | "balance") =>
    run(async () => {
      const { approval_url } = await apiFetch<{ approval_url: string }>(
        `/deals/${id}/payments/${kind}`,
        { method: "POST" },
      );
      window.location.assign(approval_url);
    });

  if (!deal) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <LoaderCircle className="size-6 animate-spin" aria-label="Loading deal" />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {deal.quantity} × {deal.product}
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            {deal.seller_name}, {deal.seller_country} → {deal.buyer_name},{" "}
            {deal.buyer_country}
          </p>
        </div>
        <Badge>{STATUS_LABELS[deal.status]}</Badge>
      </div>
      <DealSteps status={deal.status} />

      {error && (
        <p role="alert" className="mt-5 rounded-md border border-foreground/30 p-3 text-sm">
          {error}
        </p>
      )}

      <Card className="mt-6">
        {deal.status === "no_deal" && (
          <>
            <CardTitle>No deal</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              {deal.transcript[0]?.message}
            </p>
            <Link href="/deals/new" className="mt-4 inline-block">
              <Button>Try new limits</Button>
            </Link>
          </>
        )}

        {deal.status === "negotiated" && (
          <>
            <CardTitle>Both people must approve</CardTitle>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={busy || deal.buyer_approved}
                onClick={() => approve("buyer")}
              >
                <Check className="size-4" aria-hidden />
                {deal.buyer_approved ? "Buyer approved" : "Approve as buyer"}
              </Button>
              <Button
                disabled={busy || deal.seller_approved}
                onClick={() => approve("seller")}
              >
                <Check className="size-4" aria-hidden />
                {deal.seller_approved ? "Seller approved" : "Approve as seller"}
              </Button>
            </div>
          </>
        )}

        {deal.status === "approved" && (
          <>
            <CardTitle>Buyer: pay the deposit</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              You'll complete this {money(deal.deposit_cents)} payment on PayPal.
            </p>
            <Button className="mt-4" disabled={busy} onClick={() => pay("deposit")}>
              <CreditCard className="size-4" aria-hidden />
              Pay with PayPal
            </Button>
          </>
        )}

        {(deal.status === "deposit_paid" || deal.status === "proof_review") && (
          <>
            <CardTitle>Seller: upload shipping proof</CardTitle>
            {deal.verification && !deal.verification.matches && (
              <div className="mt-3 rounded-md border border-foreground/30 p-3 text-sm">
                <p className="font-medium">{deal.verification.summary}</p>
                <ul className="mt-1 list-disc pl-5">
                  {deal.verification.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => post("/shipment/accept")}
                >
                  Buyer: accept this proof anyway
                </Button>
              </div>
            )}
            <ShipmentForm
              quantity={deal.quantity}
              busy={busy}
              onSubmit={(data) => post("/shipment", data)}
            />
          </>
        )}

        {deal.status === "shipment_verified" && (
          <>
            <CardTitle>Buyer: pay the balance</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              {deal.verification?.summary}
            </p>
            <Button className="mt-4" disabled={busy} onClick={() => pay("balance")}>
              <CreditCard className="size-4" aria-hidden />
              Pay {money(deal.balance_cents)} with PayPal
            </Button>
          </>
        )}

        {deal.status === "balance_paid" && (
          <>
            <CardTitle>Buyer: inspect the goods</CardTitle>
            <InspectionForm
              quantity={deal.quantity}
              busy={busy}
              onSubmit={(data) => post("/inspection", data)}
            />
          </>
        )}

        {deal.status === "refund_suggested" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Seller: review the suggested refund</CardTitle>
              <Badge>
                {deal.claim?.mode === "ai" ? "Groq AI review" : "Rule-based demo mode"}
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold">
              {money(deal.refund_suggested_cents)}
            </p>
            <p className="mt-1 text-sm text-foreground/70">{deal.claim?.reasoning}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => post("/claim/approve")}>
                <RotateCcw className="size-4" aria-hidden />
                Approve refund
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => post("/claim/reject")}
              >
                <X className="size-4" aria-hidden />
                Reject
              </Button>
            </div>
          </>
        )}

        {deal.status === "refunded" && (
          <>
            <CardTitle>Refund sent</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              {money(deal.refund_suggested_cents)} was refunded through PayPal.
            </p>
          </>
        )}

        {deal.status === "claim_rejected" && (
          <>
            <CardTitle>Claim rejected</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              The seller rejected the suggested refund, so no refund was sent.
            </p>
          </>
        )}

        {deal.status === "closed" && (
          <>
            <CardTitle>Order closed</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              The deal is settled.
            </p>
          </>
        )}
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <NegotiationCard deal={deal} />
        <PaymentSummary deal={deal} />
      </div>
    </main>
  );
}
