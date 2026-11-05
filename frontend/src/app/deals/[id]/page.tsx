import { Suspense } from "react";

async function DealContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <h1 className="text-2xl font-semibold">Deal {id}</h1>
      <p className="mt-2 text-foreground/70">
        Deal status and payments will appear here.
      </p>
    </>
  );
}

export default function DealDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Suspense fallback={<p className="text-foreground/70">Loading deal...</p>}>
        <DealContent params={params} />
      </Suspense>
    </main>
  );
}
