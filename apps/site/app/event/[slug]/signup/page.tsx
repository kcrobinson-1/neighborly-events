import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getEventContentBySlug,
  registeredEventSlugs,
} from "../../../../lib/eventContent.ts";
import {
  ThemeScope,
  getThemeForSlug,
} from "../../../../../../shared/styles";
import { normalizeEventSlug } from "../../../../../../shared/urls";
import { SignupForm } from "./SignupForm.tsx";

/**
 * Static enumeration of every registered event slug so apps/site
 * prerenders each event's signup sub-route at `next build` time.
 * Matches the parent `[slug]` segment's `generateStaticParams`
 * source so adding a new event to `eventContentBySlug` automatically
 * extends the prerender set for `/event/<slug>/signup` too.
 */
export function generateStaticParams() {
  return registeredEventSlugs.map((slug) => ({ slug }));
}

/**
 * Per-event SSR metadata for the signup sub-route. Mirrors the
 * landing page's `noindex`-on-test-event / `noindex`-on-`meta.robots`
 * posture so demo-phase events stay out of search whether the
 * attendee lands on the landing page or the signup form first.
 * Returns `{}` for unknown slugs so Next.js falls back to the
 * layout's metadata; the `Page` itself calls `notFound()` on miss.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeEventSlug(rawSlug);
  const content = getEventContentBySlug(slug);

  if (!content) {
    return {};
  }

  return {
    title: `${content.meta.title} — Sign up for updates`,
    description: content.meta.description,
    robots:
      content.testEvent || content.meta.robots === "noindex"
        ? { index: false, follow: false }
        : undefined,
  };
}

/**
 * Public standalone newsletter-signup route. Server Component with
 * the same three-branch shape as the sibling feedback route:
 *
 *   1. resolver returns `null` (unknown slug) → `notFound()`. The 404
 *      renders outside `<ThemeScope>` against the platform Sage Civic
 *      defaults, matching the landing page's convention.
 *   2. content present, `newsletterSignup` absent → friendly
 *      disabled-event state inline (no form, just a recognizable
 *      heading and a back-to-landing Link).
 *   3. content present, `newsletterSignup` set → render `<SignupForm>`.
 *
 * Both rendered branches wrap in `<ThemeScope>` so the per-event
 * Theme tokens flow through the form chrome and the disabled-state
 * paragraph.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeEventSlug(rawSlug);
  const content = getEventContentBySlug(slug);

  if (!content) {
    notFound();
  }

  const theme = getThemeForSlug(content.themeSlug);

  if (!content.newsletterSignup) {
    return (
      <ThemeScope theme={theme}>
        <main className="event-signup-disabled">
          <h1 className="event-section-heading">{content.meta.title}</h1>
          <p>Newsletter signup isn&apos;t available for this event.</p>
          <Link
            className="event-signup-disabled-back"
            href={`/event/${encodeURIComponent(slug)}`}
          >
            Back to {content.hero.name}
          </Link>
        </main>
      </ThemeScope>
    );
  }

  return (
    <ThemeScope theme={theme}>
      <SignupForm signup={content.newsletterSignup} slug={slug} />
    </ThemeScope>
  );
}
