"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Deal, Supplier } from "@/types";

const INITIAL = {
  product: "Silk sarees",
  quantity: "100",
  buyer_name: "Cape Retail",
  buyer_country: "South Africa",
  buyer_max: "25",
  buyer_deadline_days: "21",
  seller_name: "Chennai Silk House",
  seller_country: "India",
  seller_min: "20",
  seller_lead_days: "18",
};

type FormState = typeof INITIAL;

const TEXT_LIMITS: Partial<Record<keyof FormState, [number, number]>> = {
  product: [2, 200],
  buyer_name: [1, 120],
  seller_name: [1, 120],
  buyer_country: [1, 80],
  seller_country: [1, 80],
};

export function DealForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Supplier[]>("/suppliers").then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const update = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const chooseSupplier = (name: string) => {
    if (!name) {
      update("seller_name", "");
      return;
    }
    const supplier = suppliers.find((item) => item.seller_name === name);
    if (!supplier) return;
    setForm((current) => ({
      ...current,
      product: supplier.product,
      seller_name: supplier.seller_name,
      seller_country: supplier.seller_country,
      seller_min: String(supplier.seller_min_cents / 100),
      seller_lead_days: String(supplier.seller_lead_days),
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const deal = await apiFetch<Deal>("/deals", {
        method: "POST",
        body: JSON.stringify({
          product: form.product.trim(),
          quantity: Number(form.quantity),
          buyer_name: form.buyer_name.trim(),
          buyer_country: form.buyer_country.trim(),
          seller_name: form.seller_name.trim(),
          seller_country: form.seller_country.trim(),
          buyer_max_cents: Math.round(Number(form.buyer_max) * 100),
          seller_min_cents: Math.round(Number(form.seller_min) * 100),
          buyer_deadline_days: Number(form.buyer_deadline_days),
          seller_lead_days: Number(form.seller_lead_days),
        }),
      });
      router.push(`/deals/${deal.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The deal couldn't be created.");
      setBusy(false);
    }
  };

  const input = (key: keyof FormState, type = "text") => {
    const money = key === "buyer_max" || key === "seller_min";
    const limits = TEXT_LIMITS[key];
    return (
      <Input
        name={key}
        required
        disabled={busy}
        type={type}
        min={type === "number" ? money ? 0.01 : 1 : undefined}
        max={key === "quantity" ? 100000 : key.endsWith("days") ? 365 : money ? Number.MAX_SAFE_INTEGER / 100 : undefined}
        step={type === "number" ? money ? "0.01" : "1" : undefined}
        minLength={limits?.[0]}
        maxLength={limits?.[1]}
        pattern={limits ? limits[0] === 2 ? ".*\\S.*\\S.*" : ".*\\S.*" : undefined}
        title={limits ? `Enter at least ${limits[0]} non-space character${limits[0] === 1 ? "" : "s"}.` : undefined}
        value={form[key]}
        onChange={(event) => update(key, event.target.value)}
      />
    );
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6">
      <Card className="grid gap-5">
        <CardTitle>Order</CardTitle>
        {suppliers.length > 0 && (
          <Field label="Sample supplier">
            <select
              disabled={busy}
              className="form-select"
              value={suppliers.some((supplier) => supplier.seller_name === form.seller_name) ? form.seller_name : ""}
              onChange={(event) => chooseSupplier(event.target.value)}
            >
              <option value="">Custom supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.seller_name}>{supplier.seller_name}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product">{input("product")}</Field>
          <Field label="Quantity">{input("quantity", "number")}</Field>
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="grid content-start gap-5">
          <CardTitle>Buyer limits</CardTitle>
          <p className="-mt-2 text-xs leading-6 text-muted">Your budget and when you need the goods.</p>
          <Field label="Name">{input("buyer_name")}</Field>
          <Field label="Country">{input("buyer_country")}</Field>
          <Field label="Maximum price per unit (USD)">{input("buyer_max", "number")}</Field>
          <Field label="Needed within (days)">{input("buyer_deadline_days", "number")}</Field>
        </Card>
        <Card className="grid content-start gap-5">
          <CardTitle>Seller limits</CardTitle>
          <p className="-mt-2 text-xs leading-6 text-muted">Your minimum price and delivery commitment.</p>
          <Field label="Name">{input("seller_name")}</Field>
          <Field label="Country">{input("seller_country")}</Field>
          <Field label="Minimum price per unit (USD)">{input("seller_min", "number")}</Field>
          <Field label="Delivery time (days)">{input("seller_lead_days", "number")}</Field>
        </Card>
      </div>

      {error && <p role="alert" className="text-sm font-medium">{error}</p>}
      <Button type="submit" disabled={busy} className="justify-self-start">
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {busy ? "Negotiating..." : "Start AI negotiation"}
      </Button>
    </form>
  );
}
