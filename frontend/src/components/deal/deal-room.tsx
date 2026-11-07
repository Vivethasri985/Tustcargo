"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { DealSteps } from "@/components/deal/deal-steps";
import { StageBanner } from "@/components/deal/stage-banner";
import { StatusBadge } from "@/components/deal/status-badge";
import { ParticlesBackground } from "@/components/effects/particles-background";
import { StageScene } from "@/components/stages/stage-scene";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { stageFor } from "@/lib/stages";
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
        <ParticlesBackground variant="dashboard" />
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

  const shownStatus =
    deal.status === "refunded" && deal.refund_status !== "COMPLETED" ? "refund_suggested" : deal.status;
  const stage = stageFor({ status: shownStatus, delivered: deal.delivered });

  return (
    <main className="page-shell" style={{ "--stage": stage.color } as CSSProperties}>
      <ParticlesBackground variant={stage.key} />
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-7">
        <div className="min-w-0 max-w-full wrap-anywhere">
          <p className="mb-2 text-sm font-medium" style={{ color: stage.color }}>Deal {deal.reference ?? `#${deal.id}`}</p>
          <h1 className="page-title">
            {deal.quantity} × {deal.product}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            <span className="text-saffron">{deal.seller_name}, {deal.seller_country}</span> →{" "}
            <span className="text-ocean">{deal.buyer_name}, {deal.buyer_country}</span>
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
      <DealSteps status={shownStatus} delivered={deal.delivered} />
      <StageBanner stage={stage} />

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

      <StageScene
        deal={deal}
        busy={busy}
        pendingCapture={pendingCapture}
        approve={approve}
        pay={pay}
        post={post}
      />
    </main>
  );
}
