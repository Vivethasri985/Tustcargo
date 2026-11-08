import { RequireAuth } from "@/components/auth/require-auth";
import { DealForm } from "@/components/deal/deal-form";
import { ParticlesBackground } from "@/components/effects/particles-background";

export default function NewDealPage() {
  return (
    <main className="page-shell max-w-4xl!" style={{ "--stage": "var(--orchid)" } as React.CSSProperties}>
      <ParticlesBackground variant="new" />
      <RequireAuth>
        <h1 className="page-title">Start a deal</h1>
        <p className="page-intro">
          Say whether you&apos;re buying or selling, set your own private limit, and invite your trade partner by email.
          The AI agents bargain once they join with their limit.
        </p>
        <DealForm />
      </RequireAuth>
    </main>
  );
}
