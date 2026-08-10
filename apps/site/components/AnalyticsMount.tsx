"use client";

import { Analytics } from "@vercel/analytics/next";

import { redactAnalyticsUrl } from "../../../shared/analytics/index.ts";

/**
 * apps/site's Vercel Web Analytics mount, rendered once from the root
 * layout so every route on the canonical origin reports a pageview.
 *
 * A client component rather than `<Analytics />` inline in
 * `app/layout.tsx`: `beforeSend` is a function, the layout is a Server
 * Component, and functions do not cross the RSC boundary. The wrapper
 * is where the callback is constructed, so it never has to.
 *
 * `beforeSend` drops the URL fragment from every beacon — see
 * `redactAnalyticsUrl` for why that is not optional on this app, which
 * is the one that serves `/auth/callback`.
 *
 * No endpoint overrides. apps/site is the canonical user-facing origin
 * and the default beacon paths are origin-relative, so this app's
 * pageviews resolve to this app's project; the proxied quiz routes
 * resolve there too, deliberately. The reasoning and its cost are
 * recorded in [`docs/tracking/analytics-strategy.md`](/docs/tracking/analytics-strategy.md)
 * "Beacon routing across the cross-app proxy" — read that before
 * adding `viewEndpoint` / `eventEndpoint` / `scriptSrc` here, because
 * those props would split the funnel across two datasets rather than
 * fix anything.
 */
export function AnalyticsMount() {
  return (
    <Analytics
      beforeSend={(event) => ({ ...event, url: redactAnalyticsUrl(event.url) })}
    />
  );
}
