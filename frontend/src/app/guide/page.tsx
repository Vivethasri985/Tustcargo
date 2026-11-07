import type { Metadata } from "next";
import { ArrowRight, Bot, ClipboardCheck, Eye, Gavel, Handshake, ShieldCheck, Store, User } from "lucide-react";
import { ParticlesBackground } from "@/components/effects/particles-background";
import { Faq } from "@/components/guide/faq";
import { StepExplorer } from "@/components/guide/step-explorer";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works | TrustCargo",
  description: "What TrustCargo is, who it helps, and how to run your first cross-border deal.",
};

const AGENTS = [
  {
    icon: Handshake,
    name: "Negotiators",
    color: "var(--orchid)",
    does: "One agent for the buyer and one for the seller. They bargain for up to five rounds.",
    limit: "They can't see the other side's limit or go past their own.",
  },
  {
    icon: ClipboardCheck,
    name: "Proof checker",
    color: "var(--saffron)",
    does: "Reads the shipping receipt and photos and compares them with the order.",
    limit: "A quantity mismatch always goes to the buyer to decide.",
  },
  {
    icon: Eye,
    name: "Watcher",
    color: "var(--ocean)",
    does: "Follows each shipment update and explains whether delivery is on time.",
    limit: "Dates and risk levels are calculated in code. The AI only explains them.",
  },
  {
    icon: Gavel,
    name: "Judge",
    color: "var(--coral)",
    does: "Reviews inspection results and photos, then suggests a fair refund.",
    limit: "The suggestion is capped, and the seller must approve it.",
  },
];

const BENEFITS = [
  {
    icon: Store,
    who: "For sellers",
    color: "var(--saffron)",
    points: [
      "A deposit arrives before you buy materials or start making the order.",
      "The balance is due as soon as your shipping proof is checked, before the goods arrive.",
      "Disputes are settled from evidence, so a buyer can't simply refuse to pay.",
    ],
  },
  {
    icon: User,
    who: "For buyers",
    color: "var(--ocean)",
    points: [
      "You never pay the full amount before the goods are shipped.",
      "Every payment and refund goes through PayPal, so your card details stay with PayPal.",
      "Missing or damaged goods lead to a refund suggestion worked out from what you report.",
    ],
  },
];

const BEFORE = [
  "A PayPal sandbox account for the buyer and one for the seller, from developer.paypal.com.",
  "The product, quantity, and each side's price limit and delivery time.",
  "A tracking number from your carrier and a photo or PDF of the shipping receipt.",
];

export default function GuidePage() {
  return (
    <main className="relative flex-1" style={{ "--stage": "var(--saffron)" } as React.CSSProperties}>
      <ParticlesBackground variant="guide" />

      <section className="mx-auto max-w-[110rem] px-5 pt-14 pb-10 sm:px-8 lg:px-14 lg:pt-20">
        <h1 className="font-display max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
          How TrustCargo works
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          TrustCargo helps a small seller and an overseas buyer complete a deal without
          having to trust each other first. AI agents handle the bargaining and check the
          evidence. People make every decision. PayPal moves the money in stages.
        </p>
        <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { title: "The problem", text: "The seller wants money first. The buyer wants the goods first. Someone has to take a risk.", color: "var(--coral)" },
            { title: "The fix", text: "Split the payment into a deposit and a balance, each released only when the step before it is proven.", color: "var(--saffron)" },
            { title: "The record", text: "Every offer, file, shipment update and payment is saved, so disputes start from facts.", color: "var(--mint)" },
          ].map(({ title, text, color }) => (
            <div key={title} className="rounded-xl border border-line bg-surface/85 p-5 backdrop-blur-sm">
              <span className="block h-1 w-8 rounded-full" style={{ background: color }} />
              <h2 className="font-display mt-3 text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-background/40">
        <div className="mx-auto max-w-[110rem] px-5 py-14 sm:px-8 lg:px-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Your first deal, step by step</h2>
          <p className="mt-2 mb-8 max-w-2xl text-muted">Pick a step to see what you do and what appears on screen.</p>
          <StepExplorer />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-[110rem] px-5 py-14 sm:px-8 lg:px-14">
          <div className="flex items-center gap-3">
            <Bot className="size-7 text-orchid" aria-hidden />
            <h2 className="font-display text-3xl font-semibold tracking-tight">The four AI agents</h2>
          </div>
          <p className="mt-2 max-w-2xl text-muted">
            Each agent does one job. Where an agent could make a costly mistake, a rule in the code limits what it can do.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map(({ icon: Icon, name, color, does, limit }) => (
              <li key={name} className="rounded-xl border border-line bg-surface/90 p-5 backdrop-blur-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
                <Icon className="size-6" style={{ color }} aria-hidden />
                <h3 className="font-display mt-3 text-lg font-semibold">{name}</h3>
                <p className="mt-1 text-sm leading-6 text-foreground/85">{does}</p>
                <p className="mt-3 flex gap-2 text-xs leading-5 text-muted">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" style={{ color }} aria-hidden />
                  {limit}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line bg-background/40">
        <div className="mx-auto grid max-w-[110rem] gap-6 px-5 py-14 sm:px-8 lg:px-14 md:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, who, color, points }) => (
            <div key={who} className="rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur-sm sm:p-8" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 12%, var(--surface)), var(--surface) 60%)` }}>
              <div className="flex items-center gap-3">
                <Icon className="size-6" style={{ color }} aria-hidden />
                <h2 className="font-display text-2xl font-semibold">{who}</h2>
              </div>
              <ul className="mt-5 grid gap-3">
                {points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-6 text-foreground/85">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[110rem] gap-10 px-5 py-14 sm:px-8 lg:px-14 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Before you start</h2>
            <ol className="mt-6 grid gap-4">
              {BEFORE.map((item, index) => (
                <li key={item} className="flex gap-4 text-sm leading-6">
                  <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-saffron/15 font-semibold text-saffron">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-foreground/85">{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <ButtonLink href="/deals/new" className="px-6">
                Start your first deal <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <div>
            <h2 className="font-display mb-6 text-3xl font-semibold tracking-tight">Common questions</h2>
            <Faq />
          </div>
        </div>
      </section>
    </main>
  );
}
