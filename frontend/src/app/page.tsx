import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-24">
        <div>
          <h1 className="max-w-2xl text-4xl font-medium leading-[1.12] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Cross-border trade you can trust
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-muted">
            AI agents negotiate and check the evidence. People approve. PayPal
            handles each payment and refund.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/deals/new" className="px-6">
              Start a deal <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="outline" className="px-6">View dashboard</ButtonLink>
          </div>
        </div>
      </section>

      <section className="relative border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
          <h2 className="mb-7 text-lg font-medium">How a deal works</h2>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              { title: "Agree on terms", text: "Set buyer and seller limits. AI negotiates within them, and both people approve the agreement." },
              { title: "Pay and ship", text: "Pay the deposit, submit shipping proof, then pay the balance once the shipment is verified." },
              { title: "Inspect the delivery", text: "Inspect the goods. If there is a problem, AI recommends a refund for the seller to review." },
            ].map(({ title, text }) => (
              <div key={title}>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
