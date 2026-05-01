import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import {
  getEventContentBySlug,
  registeredEventSlugs,
} from "../../../lib/eventContent.ts";
import { EventOgImage } from "../../../lib/eventOgImage.tsx";

/**
 * Per-event Open Graph image, served by the Next.js 16 file
 * convention at `/event/[slug]/opengraph-image`. Statically optimized
 * — generated once per registered slug at `next build` time and
 * cached — because no Request-time API is called (`cookies()`,
 * `headers()`, `searchParams`, uncached `fetch`) per
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`
 * lines 89-94.
 *
 * Next.js auto-emits the corresponding meta tags (`og:image`,
 * `og:image:width`, `og:image:height`, `og:image:type`,
 * `og:image:alt`) on every page in this segment from the route's
 * exports — the per-event page route does NOT also set
 * `openGraph.images`, which would risk duplicate emission per the
 * 3.1.2 plan's cross-cutting invariant.
 *
 * `alt` is a module-level static export (per the file convention,
 * `alt` cannot read route params at request time); generic
 * platform-level wording is sufficient for screen readers and crawlers
 * because the rendered image already carries per-event content
 * visually.
 */

export const alt = "Neighborly Events — event preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Statically enumerate every registered event slug so Next.js
 * prerenders the OG image at `next build` time. Without this, the
 * image route is treated as Dynamic and rendered on every crawl —
 * defeating the unfurl-preview prerender goal stated in the M3
 * milestone doc. Reads from `registeredEventSlugs` so the prerender
 * list stays in sync with the registry by construction (matches the
 * page route's `generateStaticParams`).
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
