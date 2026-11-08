import { RequireAuth } from "@/components/auth/require-auth";
import { DealList } from "@/components/deal/deal-list";
import { ParticlesBackground } from "@/components/effects/particles-background";
import { ButtonLink } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="page-shell" style={{ "--stage": "var(--mint)" } as React.CSSProperties}>
      <ParticlesBackground variant="dashboard" />
      <RequireAuth>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-intro">
              Invitations, deals waiting on you, and everything already moving. Each colour shows where a deal stands.
            </p>
          </div>
          <ButtonLink href="/deals/new">New deal</ButtonLink>
        </div>
        <DealList />
      </RequireAuth>
    </main>
  );
}
