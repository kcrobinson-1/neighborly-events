import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import {
  getEventContentBySlug,
  registeredEventSlugs,
} from "../../../lib/eventContent.ts";
import { EventOgImage } from "../../../lib/eventOgImage.tsx";

/**
 * Per-event Twitter card image, served by the Next.js 16 file
 * convention at `/event/[slug]/twitter-image`. Identical shape to
 * `opengraph-image.tsx` and renders the same `EventOgImage` element so
 * the OG card and the Twitter card cannot drift on future content or
 * theme changes (M3 phase 3.1.2 cross-cutting invariant).
 *
 * Next.js auto-emits `twitter:image*` meta tags from the route's
 * exports per the file convention. The two routes generate identical
 * image bytes twice at build time — acceptable for the small
 * test-event registry; if the registry grows large enough that double
 * generation becomes a meaningful build-time cost, a later plan can
 * extract a memoized helper.
 */

export const alt = "Neighborly Events — event preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Same prerender-enumeration rationale as the OG image route in this
 * segment — matches the page route's `generateStaticParams` so adding
 * a new event to `eventContentBySlug` automatically extends the
 * Twitter card prerender set too.
 */
export function generateStaticParams() {
  return registeredEventSlugs.map((slug) => ({ slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = getEventContentBySlug(slug);

  if (!content) {
    notFound();
  }

  return new ImageResponse(<EventOgImage content={content} />, {
    ...size,
  });
}
