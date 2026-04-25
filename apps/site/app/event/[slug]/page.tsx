import { cookies } from "next/headers";

export default async function EventPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Kept wired so M1 phase 1.3 can re-point this at the real
  // frontend-origin auth cookie without re-introducing the import.
  await cookies();

  return (
    <main>
      <h1>Event placeholder</h1>
      <p>
        Slug: <code>{slug}</code>
      </p>
      <p>
        Served by <code>apps/site</code> (Next.js 16). The real event landing
        page lands in M3 of the Event Platform Epic.
      </p>
      <h2>Cookie-boundary verification</h2>
      <p>
        Deferred to M1 phase 1.3. The cookie originally chosen for this
        readout (<code>neighborly_session</code>) is set on the Supabase
        Edge Function origin, not the apps/web frontend domain, so it is
        structurally invisible to <code>apps/site</code> regardless of
        the rewrite topology. See{" "}
        <code>docs/plans/site-scaffold-and-routing.md</code> &quot;Verification
        Evidence&quot; for the full analysis.
      </p>
    </main>
  );
}
