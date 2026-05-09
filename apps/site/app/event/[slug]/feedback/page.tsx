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
import { FeedbackForm } from "./FeedbackForm.tsx";

/**
 * Static enumeration of every registered event slug so apps/site
 * prerenders each event's feedback sub-route at `next build` time.
 * Matches the parent `[slug]` segment's `generateStaticParams`
 * source so adding a new event to `eventContentBySlug` automatically
 * extends the prerender set for `/event/<slug>/feedback` too.
 */
export function generateStaticParams() {
  return registeredEventSlugs.map((slug) => ({ slug }));
}

/**
 * Per-event SSR metadata for the feedback sub-route. Mirrors the
 * landing page's `noindex`-on-test-event / `noindex`-on-`meta.robots`
 * posture so demo-phase events stay out of search whether the
 * attendee lands on the landing page or the feedback form first.
 * Returns `{}` for unknown slugs so Next.js falls back to the
 * layout's metadata; the `Page` itself calls `notFound()` on miss.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const content = getEventContentBySlug(slug);

  if (!content) {
    return {};
  }

  return {
    title: `${content.meta.title} — Feedback`,
    description: content.meta.description,
    robots:
      content.testEvent || content.meta.robots === "noindex"
        ? { index: false, follow: false }
        : undefined,
  };
}

/**
 * Public event-feedback route. Server Component. Three-branch shape
 * per the M1 phase 1.3 plan's route contract:
 *
 *   1. resolver returns `null` (unknown slug) → `notFound()`. The 404
 *      renders outside `<ThemeScope>` against the platform Sage Civic
 *      defaults, matching the landing page's convention.
 *   2. content present, `feedback` absent → friendly disabled-event
 *      state inline (no form, no rating rows, just a recognizable
 *      heading and a back-to-landing Link).
 *   3. content present, `feedback` set → render `<FeedbackForm>`.
 *
 * Both rendered branches wrap in `<ThemeScope>` so the per-event
 * Theme tokens flow through the form chrome and the disabled-state
 * paragraph (the landing page does the same on the parent route).
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const content = getEventContentBySlug(slug);

  if (!content) {
    notFound();
  }

  const theme = getThemeForSlug(content.themeSlug);

  if (!content.feedback) {
    return (
      <ThemeScope theme={theme}>
        <main className="event-feedback-disabled">
          <h1 className="event-section-heading">{content.meta.title}</h1>
          <p>Feedback isn&apos;t being collected for this event.</p>
          <Link
            className="event-feedback-disabled-back"
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
      <FeedbackForm feedback={content.feedback} slug={slug} />
    </ThemeScope>
  );
}
