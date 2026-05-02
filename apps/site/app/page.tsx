import type { Metadata } from "next";

import { HarvestNarrative } from "../components/home/HarvestNarrative.tsx";
import { HomeHero } from "../components/home/HomeHero.tsx";
import { TwoEventShowcase } from "../components/home/TwoEventShowcase.tsx";

/**
 * Route-scoped metadata. Adds (does not replace) `robots` to the
 * layout's `title` + `metadataBase` per Next.js' segment-cascade —
 * top-level keys shallow-merge across segments, so naming only
 * `robots` here preserves the layout values. Keeping the noindex
 * scoped to `/` rather than at the layout level lets future
 * non-test-event apps/site routes index normally; mirrors the
 * `/event/[slug]` route-local pattern.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Home() {
  return (
    <main className="home-shell">
      <HomeHero />
      <TwoEventShowcase />
      <HarvestNarrative />
    </main>
  );
}
