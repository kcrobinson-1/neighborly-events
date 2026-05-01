import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventLandingPage } from "../../../components/event/EventLandingPage.tsx";
import {
  getEventContentBySlug,
  registeredEventSlugs,
} from "../../../lib/eventContent.ts";
import { ThemeScope, getThemeForSlug } from "../../../../../shared/styles";

/**
 * Static enumeration of every registered event slug so apps/site
 * prerenders each event at `next build` time. Reads from
 * `registeredEventSlugs` so the prerender list stays in sync with
 * the registry by construction — adding a new event to
 * `eventContentBySlug` automatically extends this set.
 */
export function generateStaticParams() {
  return registeredEventSlugs.map((slug) => ({ slug }));
}

/**
 * Per-event SSR metadata. Resolves the content module, returns `{}`
 * for unknown slugs so Next.js falls back to the layout's metadata.
 * For known slugs, emits text-only Open Graph fields plus
 * `openGraph.url` as a relative path that resolves against the root
 * layout's `metadataBase` (M3 phase 3.1.2). `og:image` and
 * `twitter:image` are auto-emitted by the file-convention
 * `opengraph-image.tsx` / `twitter-image.tsx` routes colocated in this
 * segment — per the 3.1.2 cross-cutting invariant, this route does
 * **not** also set `openGraph.images` or `twitter.images`, which would
 * risk duplicate or unspecified-order emission per Next.js' segment
 * cascade rules.
 *
 * `robots: { index: false, follow: false }` ships when
 * `content.testEvent === true` so the test event is server-rendered
 * as `noindex, nofollow` before any client hydration. A client-side
 * `<meta>` injection (e.g., a `useEffect` that appends to
 * `document.head`) would silently regress this invariant; the curl
 * falsifier in the plan's Validation Gate guards against that drift.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = getEventContentBySlug(slug);

  if (!content) {
    return {};
  }

  return {
    title: content.meta.title,
    description: content.meta.description,
    openGraph: {
      title: content.meta.title,
      description: content.meta.description,
      type: content.meta.openGraphType ?? "website",
      siteName: "Neighborly Events",
      url: `/event/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: content.meta.title,
      description: content.meta.description,
    },
    robots: content.testEvent
      ? { index: false, follow: false }
      : undefined,
  };
}

/**
 * Public event landing page. Server Component (no `'use client'`,
 * no Request-time API calls — `cookies()`, `headers()`,
 * `searchParams` would silently flip the route from SSG to SSR and
 * defeat the unfurl-preview goal stated in the M3 milestone doc).
 * Reads the content module, calls `notFound()` on miss (the 404
 * renders outside `<ThemeScope>` against the platform Sage Civic
 * `:root` defaults, by design — no slug means no Theme to resolve),
 * otherwise wraps the rendered tree in `<ThemeScope>` exactly once
 * with the per-event Theme.
 *
 * Theme resolution reads `content.themeSlug`, **not** the URL slug,
 * so the `EventContent` contract permission for two events to
 * share a Theme registered under one key actually works. Resolving
 * via `slug` would silently fall back to the platform Theme for any
 * event whose `themeSlug !== slug`, masking the contract violation
 * behind `getThemeForSlug`'s defined platform fallback.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = getEventContentBySlug(slug);

  if (!content) {
    notFound();
  }

  return (
    <ThemeScope theme={getThemeForSlug(content.themeSlug)}>
      <EventLandingPage content={content} slug={slug} />
    </ThemeScope>
  );
}
