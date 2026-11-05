import { DealForm } from "@/components/deal/deal-form";

export default function NewDealPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Start a deal</h1>
      <p className="mt-2 text-foreground/70">
        Set each side's limits. The AI agents will negotiate inside them.
      </p>
      <DealForm />
    </main>
  );
}
