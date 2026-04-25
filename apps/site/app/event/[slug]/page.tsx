import { cookies } from "next/headers";

export default async function EventPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const sessionCookiePresent = cookieStore.has("neighborly_session");

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
      <h2>Cookie boundary readout</h2>
      <p>
        <code>neighborly_session</code> cookie visible to <code>apps/site</code>:{" "}
        <strong>
          {sessionCookiePresent ? "YES — present" : "NO — not visible"}
        </strong>
      </p>
      <p>
        This readout reports presence only and never echoes the cookie value. It
        is the verification artifact for M0 phase 0.3; the procedure to
        re-confirm it is documented in <code>docs/dev.md</code>.
      </p>
    </main>
  );
}
