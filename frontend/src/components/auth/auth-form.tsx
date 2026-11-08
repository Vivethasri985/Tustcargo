"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Globe2, LoaderCircle, LockKeyhole, Mail, Store, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";
import { useAuth } from "./auth-provider";
import { safeNext } from "./require-auth";

type Mode = "login" | "signup";

const EMPTY = { email: "", password: "", name: "", business_name: "", country: "" };

function IconInput({ icon: Icon, ...props }: React.ComponentProps<typeof Input> & { icon: typeof Mail }) {
  return (
    <span className="relative block">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input className="pl-9" {...props} />
    </span>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("/dashboard");
  const signup = mode === "signup";

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const update = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body = signup
        ? { ...form, email: form.email.trim(), name: form.name.trim(), business_name: form.business_name.trim(), country: form.country.trim() }
        : { email: form.email.trim(), password: form.password };
      const result = await apiFetch<User>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      setUser(result);
      router.replace(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const otherHref = `${signup ? "/login" : "/signup"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="stage-ring relative overflow-hidden rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur sm:p-9"
    >
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saffron via-coral to-ocean"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        style={{ transformOrigin: "left" }}
      />
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {signup ? "Create your trade account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        {signup
          ? "One account works for buying and selling. Your price limits stay private to you."
          : "Log in to see your deals and invitations."}
      </p>

      <div className="mt-7 grid gap-4">
        <AnimatePresence initial={false}>
          {signup && (
            <motion.div
              key="names"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Your name">
                <IconInput icon={UserRound} name="name" required maxLength={120} autoComplete="name" disabled={busy} value={form.name} onChange={update("name")} />
              </Field>
              <Field label="Business name (optional)">
                <IconInput icon={Store} name="business_name" maxLength={120} autoComplete="organization" disabled={busy} value={form.business_name} onChange={update("business_name")} />
              </Field>
              <Field label="Country">
                <IconInput icon={Globe2} name="country" required maxLength={80} autoComplete="country-name" disabled={busy} value={form.country} onChange={update("country")} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <Field label="Email">
          <IconInput icon={Mail} name="email" type="email" required autoComplete="email" disabled={busy} value={form.email} onChange={update("email")} />
        </Field>
        <Field label="Password">
          <IconInput
            icon={LockKeyhole}
            name="password"
            type="password"
            required
            minLength={signup ? 8 : 1}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            disabled={busy}
            value={form.password}
            onChange={update("password")}
          />
        </Field>
        {signup && <p className="-mt-2 text-xs text-muted">At least 8 characters.</p>}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: [0, -5, 5, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-5 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" disabled={busy} className="mt-6 w-full py-3 text-base">
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
        {busy ? (signup ? "Creating account..." : "Logging in...") : signup ? "Create account" : "Log in"}
      </Button>
      <p className="mt-5 text-center text-sm text-muted">
        {signup ? "Already have an account? " : "New to TrustCargo? "}
        <Link href={otherHref} className="font-medium text-foreground underline underline-offset-4">
          {signup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </motion.form>
  );
}
