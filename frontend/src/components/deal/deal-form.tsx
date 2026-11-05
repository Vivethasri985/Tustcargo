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
    setBusy(true);
    setError("");
    try {
      const deal = await apiFetch<Deal>("/deals", {
        method: "POST",
        body: JSON.stringify({
          product: form.product,
          quantity: Number(form.quantity),
          buyer_name: form.buyer_name,
          buyer_country: form.buyer_country,
          seller_name: form.seller_name,
          seller_country: form.seller_country,
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

  const input = (key: keyof FormState, type = "text") => (
    <Input
      required
      type={type}
      min={type === "number" ? "0.01" : undefined}
      step={type === "number" ? "any" : undefined}
      value={form[key]}
      onChange={(event) => update(key, event.target.value)}
    />
  );

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5">
      <Card className="grid gap-4">
        <CardTitle>Order</CardTitle>
        {suppliers.length > 0 && (
          <Field label="Sample supplier">
            <select
              className="h-10 rounded-md border border-foreground/20 bg-background px-3 text-sm"
              value={form.seller_name}
              onChange={(event) => chooseSupplier(event.target.value)}
            >
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
        <Card className="grid content-start gap-4">
          <CardTitle>Buyer limits</CardTitle>
          <Field label="Name">{input("buyer_name")}</Field>
          <Field label="Country">{input("buyer_country")}</Field>
          <Field label="Maximum price per unit (USD)">{input("buyer_max", "number")}</Field>
          <Field label="Needed within (days)">{input("buyer_deadline_days", "number")}</Field>
        </Card>
        <Card className="grid content-start gap-4">
          <CardTitle>Seller limits</CardTitle>
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
