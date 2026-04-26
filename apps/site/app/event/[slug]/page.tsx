import { cookies } from "next/headers";

/**
 * `@supabase/ssr`'s `createBrowserClient` writes the auth session as a
 * cookie named `sb-<project-ref>-auth-token` on the apps/web frontend
 * origin (and chunks the JWT into `auth-token.0`/`auth-token.1`/...
 * siblings when it exceeds the per-cookie size limit). The strict
 * pattern matches the unchunked form and any chunked sibling. No other
 * cookie family in this repo collides with the `sb-*-auth-token` shape.
 */
const AUTH_COOKIE_PATTERN = /^sb-[^-]+-auth-token(\.\d+)?$/;

export default async function EventPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const authCookiePresent = cookieStore
    .getAll()
    .some((cookie) => AUTH_COOKIE_PATTERN.test(cookie.name));

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
        Looking for any cookie matching{" "}
        <code>sb-&lt;project-ref&gt;-auth-token</code> (or chunked siblings
        like <code>.0</code>, <code>.1</code>) on this origin.
      </p>
      <p>
        Auth cookie:{" "}
        <strong>{authCookiePresent ? "present" : "not present"}</strong>
      </p>
      <p>
        See{" "}
        <code>docs/plans/shared-auth-foundation.md</code> subphase 1.3.2 for
        the full verification procedure.
      </p>
    </main>
  );
}
