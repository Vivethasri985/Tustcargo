import { ArrowRight, BookOpen } from "lucide-react";
import { ParticlesBackground } from "@/components/effects/particles-background";
import { SeaLane } from "@/components/home/sea-lane";
import { StageRibbon } from "@/components/home/stage-ribbon";
import { ButtonLink } from "@/components/ui/button";

const MONEY = [
  { label: "Deposit", text: "Paid on PayPal after both people approve, so the seller can start work.", color: "var(--paypal)" },
  { label: "Balance", text: "Paid on PayPal once the AI has checked the shipping proof.", color: "var(--mint)" },
  { label: "Refund", text: "Sent back through PayPal for missing or damaged goods, after the seller agrees.", color: "var(--coral)" },
];

export default function Home() {
  return (
    <main className="relative flex-1" style={{ "--stage": "var(--saffron)" } as React.CSSProperties}>
      <ParticlesBackground variant="home" />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <h1 className="font-display max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Cross-border trade you can trust
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            AI agents negotiate and check the evidence. People approve. PayPal
            handles each payment and refund.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/deals/new" className="px-6">
              Start a deal <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="outline" className="px-6">View dashboard</ButtonLink>
            <ButtonLink href="/guide" variant="outline" className="px-6">
              <BookOpen className="size-4" aria-hidden /> How it works
            </ButtonLink>
          </div>
        </div>
        <SeaLane />
      </section>

      <section className="relative border-t border-line bg-background/40">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight">How a deal works</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Eight steps, each with its own colour. You&apos;ll see the same colour on the deal page when it&apos;s that step&apos;s turn.
          </p>
          <div className="mt-8">
            <StageRibbon />
          </div>
        </div>
      </section>

      <section className="relative border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Where PayPal comes in</h2>
            <p className="mt-2 text-muted">Money moves three times, and only after the step before it is done.</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {MONEY.map(({ label, text, color }) => (
              <li key={label} className="rounded-xl border border-line bg-surface/85 p-5 backdrop-blur-sm">
                <span className="block h-1.5 w-10 rounded-full" style={{ background: color }} />
                <h3 className="font-display mt-4 text-lg font-semibold">{label}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
