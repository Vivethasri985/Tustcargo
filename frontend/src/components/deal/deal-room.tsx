"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, CreditCard, LoaderCircle, RotateCcw, X } from "lucide-react";
import { InspectionForm } from "@/components/claim/inspection-form";
import { DealSteps } from "@/components/deal/deal-steps";
import { StatusBadge } from "@/components/deal/status-badge";
import { NegotiationCard } from "@/components/deal/negotiation-card";
import { PaymentSummary } from "@/components/payment/payment-summary";
import { ShipmentForm } from "@/components/shipment/shipment-form";
import { TrackingCard } from "@/components/shipment/tracking-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { money } from "@/lib/format";
import type { Deal } from "@/types";

export function DealRoom() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pendingCapture, setPendingCapture] = useState<"deposit" | "balance" | null>(null);
  const captureRequest = useRef<{ key: string; promise: Promise<Deal> } | null>(null);

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
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind");
    const returning = params.get("paypal") === "return";
    const paymentKind = returning && (kind === "deposit" || kind === "balance") ? kind : null;
    const cancelled = params.get("paypal") === "cancel";
    setDeal(null);
    setError("");
    setBusy(true);
    setPendingCapture(paymentKind);

    let request: Promise<Deal>;
    if (paymentKind) {
      // Reuse a capture during React Strict Mode's effect replay.
      const key = `${id}:${paymentKind}:${retry}`;
      if (captureRequest.current?.key !== key) {
        captureRequest.current = {
          key,
          promise: apiFetch<Deal>(`/deals/${id}/payments/${paymentKind}/capture`, { method: "POST" }),
        };
      }
      request = captureRequest.current.promise;
    } else {
      request = apiFetch<Deal>(`/deals/${id}`);
    }

    request.then((result) => {
      if (!active) return;
      setDeal(result);
      if (paymentKind && !result.payments.some((payment) => payment.kind === paymentKind && payment.status === "COMPLETED")) {
        setError("PayPal is still processing this payment. Check its status again before continuing.");
        return;
      }
      setPendingCapture(null);
      if (paymentKind || cancelled) window.history.replaceState(null, "", `/deals/${id}`);
      if (cancelled) setError("The PayPal payment was cancelled. You can try again when you're ready.");
      if (returning && !paymentKind) setError("This payment return link is invalid. Check the deal before trying again.");
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "The deal couldn't be loaded.");
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [id, retry]);

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
      <main className="page-shell">
        {error ? (
          <div>
            <p role="alert">{error}</p>
            <Button className="mt-4" disabled={busy} onClick={() => setRetry((value) => value + 1)}>
              {pendingCapture ? "Retry payment confirmation" : "Retry loading deal"}
            </Button>
            <Link href="/dashboard" className="ml-4 text-sm underline">Back to dashboard</Link>
          </div>
        ) : (
          <LoaderCircle className="size-6 animate-spin" aria-label="Loading deal" />
        )}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-7">
        <div className="min-w-0 max-w-full wrap-anywhere">
          <p className="mb-2 text-sm text-muted">Deal #{deal.id}</p>
          <h1 className="page-title">
            {deal.quantity} × {deal.product}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {deal.seller_name}, {deal.seller_country} → {deal.buyer_name},{" "}
            {deal.buyer_country}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            status={deal.status}
            refundStatus={deal.refund_status}
            delivered={deal.delivered}
          />
          <Button
            variant="outline"
            disabled={busy || pendingCapture !== null}
            onClick={() => run(() => apiFetch<Deal>(`/deals/${id}`))}
          >
            <RotateCcw className="size-4" aria-hidden />
            {busy ? "Updating..." : "Refresh status"}
          </Button>
        </div>
      </div>
      <DealSteps status={deal.status === "refunded" && deal.refund_status !== "COMPLETED" ? "refund_suggested" : deal.status} />

      {error && (
        <div className="mt-5 rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm">
          <p role="alert">{error}</p>
          {pendingCapture && (
            <Button className="mt-3" disabled={busy} onClick={() => setRetry((value) => value + 1)}>
              Retry payment confirmation
            </Button>
          )}
        </div>
      )}

      <Card className="mt-6">
        {deal.status === "no_deal" && (
          <>
            <CardTitle>No deal</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              {deal.transcript[0]?.message}
            </p>
            <ButtonLink href="/deals/new" className="mt-4">Try new limits</ButtonLink>
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
            <Button className="mt-4" disabled={busy || pendingCapture !== null} onClick={() => pay("deposit")}>
              <CreditCard className="size-4" aria-hidden />
              Pay with PayPal
            </Button>
          </>
        )}

        {(deal.status === "deposit_paid" || deal.status === "proof_review") && (
          <>
            <CardTitle>Seller: upload shipping proof</CardTitle>
            {deal.verification && !deal.verification.matches && (
              <div className="mt-4 rounded-xl border border-warning/20 bg-warning-soft p-4 text-sm leading-6">
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
            <Button className="mt-4" disabled={busy || pendingCapture !== null} onClick={() => pay("balance")}>
              <CreditCard className="size-4" aria-hidden />
              Pay {money(deal.balance_cents)} with PayPal
            </Button>
          </>
        )}

        {deal.status === "balance_paid" && !deal.delivered && (
          <>
            <CardTitle>Waiting for delivery</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              The balance is paid. The buyer can inspect the goods once the Watcher
              shows the shipment as delivered.
            </p>
          </>
        )}

        {deal.status === "balance_paid" && deal.delivered && (
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
            <CardTitle>{deal.refund_status === "COMPLETED" ? "Refund sent" : "Refund status"}</CardTitle>
            <p className="mt-2 text-sm text-foreground/70">
              {deal.refund_status === "COMPLETED"
                ? `${money(deal.refund_suggested_cents)} was refunded through PayPal.`
                : `PayPal has not confirmed this refund as complete. Current status: ${deal.refund_status ?? "Unavailable"}. Use Refresh status to check for updates.`}
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

      <TrackingCard
        deal={deal}
        busy={busy}
        onAdvance={() => post("/tracking/advance")}
        onDelay={() => post("/tracking/delay")}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <NegotiationCard deal={deal} />
        <PaymentSummary deal={deal} />
      </div>
    </main>
  );
}
