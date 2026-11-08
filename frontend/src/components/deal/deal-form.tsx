"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, LoaderCircle, Mail, Package, Send, ShoppingCart, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Deal, Party, Partner } from "@/types";

const ROLES: Array<{ value: Party; label: string; hint: string; icon: typeof Store; color: string }> = [
  { value: "seller", label: "I'm selling", hint: "You ship goods and get paid", icon: Store, color: "var(--saffron)" },
  { value: "buyer", label: "I'm buying", hint: "You pay and receive goods", icon: ShoppingCart, color: "var(--ocean)" },
];

export const LIMIT_COPY: Record<Party, { price: string; days: string; priceHint: string }> = {
  seller: {
    price: "Lowest price you'll accept per unit (USD)",
    days: "Days you need to deliver",
    priceHint: "Your agent never sells below this.",
  },
  buyer: {
    price: "Highest price you'll pay per unit (USD)",
    days: "Days until you need the goods",
    priceHint: "Your agent never offers more than this.",
  },
};

export function DealForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [role, setRole] = useState<Party>("seller");
  const [form, setForm] = useState({ product: "", quantity: "", email: "", limit: "", days: "" });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const partnerRole = role === "seller" ? "buyer" : "seller";
  const copy = LIMIT_COPY[role];
  const accent = role === "seller" ? "var(--saffron)" : "var(--ocean)";

  useEffect(() => {
    apiFetch<Partner[]>("/partners").then(setPartners).catch(() => setPartners([]));
  }, []);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const choosePartner = (email: string) => {
    const partner = partners.find((item) => item.email === email);
    if (!partner) return;
    setForm((current) => ({
      ...current,
      email: partner.email,
      product: current.product || partner.last_product,
      quantity: current.quantity || String(partner.last_quantity),
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (user && form.email.trim().toLowerCase() === user.email) {
      setError("Invite someone else. You can't trade with your own account.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const deal = await apiFetch<Deal>("/deals", {
        method: "POST",
        body: JSON.stringify({
          role,
          product: form.product.trim(),
          quantity: Number(form.quantity),
          counterparty_email: form.email.trim(),
          limit_cents: Math.round(Number(form.limit) * 100),
          days: Number(form.days),
        }),
      });
      router.push(`/deals/${deal.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The deal couldn't be created.");
      setBusy(false);
    }
  };

  const chosen = partners.some((partner) => partner.email === form.email.trim().toLowerCase())
    ? form.email.trim().toLowerCase()
    : "";

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6" style={{ "--stage": accent } as React.CSSProperties}>
      <div role="radiogroup" aria-label="Your side of the deal" className="grid gap-3 sm:grid-cols-2">
        {ROLES.map(({ value, label, hint, icon: Icon, color }) => {
          const active = role === value;
          return (
            <motion.button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={busy}
              onClick={() => setRole(value)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex items-center gap-4 overflow-hidden rounded-xl border p-4 text-left transition-colors",
                active ? "border-transparent" : "border-line bg-surface/70 hover:border-foreground/30",
              )}
            >
              {active && (
                <motion.span
                  layoutId="role-pick"
                  className="absolute inset-0 rounded-xl border-2"
                  style={{ borderColor: color, background: `color-mix(in srgb, ${color} 12%, var(--surface))` }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-lg" style={{ color, background: `color-mix(in srgb, ${color} 18%, transparent)` }}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="relative">
                <span className="font-display block text-lg font-semibold">{label}</span>
                <span className="text-sm text-muted">{hint}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <Card className="grid gap-5 border-t-2 border-t-orchid">
        <CardTitle className="flex items-center gap-2"><Package className="size-5 text-orchid" aria-hidden />Order</CardTitle>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Product">
            <Input name="product" required minLength={2} maxLength={200} pattern=".*\S.*\S.*" disabled={busy} value={form.product} onChange={update("product")} placeholder="For example, silk sarees" />
          </Field>
          <Field label="Quantity">
            <Input name="quantity" type="number" required min={1} max={100000} step={1} disabled={busy} value={form.quantity} onChange={update("quantity")} />
          </Field>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="grid content-start gap-5 border-t-2 border-t-ocean">
          <CardTitle className="flex items-center gap-2"><Users className="size-5 text-ocean" aria-hidden />Trade partner</CardTitle>
          <p className="-mt-2 text-sm leading-6 text-muted">
            The {partnerRole} gets an email invite. They sign in with this address to join.
          </p>
          {partners.length > 0 && (
            <Field label="Saved trade partners">
              <select className="form-select" disabled={busy} value={chosen} onChange={(event) => choosePartner(event.target.value)}>
                <option value="">Choose a past partner</option>
                {partners.map((partner) => (
                  <option key={partner.email} value={partner.email}>
                    {partner.name ? `${partner.name}${partner.country ? `, ${partner.country}` : ""}` : partner.email}
                    {` · ${partner.deals} ${partner.deals === 1 ? "deal" : "deals"}`}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={`${partnerRole === "buyer" ? "Buyer" : "Seller"} email`}>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input name="counterparty_email" type="email" required className="pl-9" disabled={busy} value={form.email} onChange={update("email")} />
            </span>
          </Field>
        </Card>

        <Card
          className="relative grid content-start gap-5 overflow-hidden border-t-2"
          style={{ borderTopColor: accent, background: `linear-gradient(to bottom, color-mix(in srgb, ${accent} 8%, var(--surface)), var(--surface))` }}
        >
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="size-5" style={{ color: accent }} aria-hidden />Your private limit
          </CardTitle>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={role}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="grid gap-5"
            >
              <Field label={copy.price}>
                <Input name="limit" type="number" required min={0.01} step="0.01" max={1000000} disabled={busy} value={form.limit} onChange={update("limit")} />
              </Field>
              <Field label={copy.days}>
                <Input name="days" type="number" required min={1} max={365} step={1} disabled={busy} value={form.days} onChange={update("days")} />
              </Field>
            </motion.div>
          </AnimatePresence>
          <p className="text-xs leading-5 text-muted">{copy.priceHint} Your partner never sees this number.</p>
        </Card>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm font-medium text-coral">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <Button type="submit" disabled={busy} className="justify-self-start px-6">
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {busy ? "Sending invite..." : `Invite the ${partnerRole}`}
      </Button>
    </form>
  );
}
