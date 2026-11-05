import Link from "next/link";
import { DealList } from "@/components/deal/deal-list";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/deals/new">
          <Button>New deal</Button>
        </Link>
      </div>
      <DealList />
    </main>
  );
}
