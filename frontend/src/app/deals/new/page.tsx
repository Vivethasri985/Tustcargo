import { DealForm } from "@/components/deal/deal-form";

export default function NewDealPage() {
  return (
    <main className="page-shell max-w-4xl!">
      <h1 className="page-title">Start a deal</h1>
      <p className="page-intro">
        Set each side's limits. The AI agents will negotiate inside them.
      </p>
      <DealForm />
    </main>
  );
}
