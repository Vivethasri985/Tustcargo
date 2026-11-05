import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ParticlesBackground } from "@/components/effects/particles-background";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-24">
      <ParticlesBackground />
      <section className="relative mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Cross-border trade you can trust
        </h1>
        <p className="mt-5 text-lg text-foreground/70">
          AI agents negotiate and check the evidence. People approve. PayPal
          handles each payment and refund.
        </p>
        <Link href="/deals/new" className="mt-8 inline-block">
          <Button>
            Start a deal
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </Link>
      </section>
    </main>
  );
}
