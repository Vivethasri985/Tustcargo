import { DealList } from "@/components/deal/deal-list";
import { ButtonLink } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="page-shell">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-intro">View your deals and check what needs your attention.</p>
        </div>
        <ButtonLink href="/deals/new">New deal</ButtonLink>
      </div>
      <DealList />
    </main>
  );
}
