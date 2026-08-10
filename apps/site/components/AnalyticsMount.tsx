"use client";

import { Analytics } from "@vercel/analytics/next";

import { redactAnalyticsEvent } from "../../../shared/analytics/index.ts";

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
 * is the one that serves `/auth/callback`. The handler is the shared
 * module-scope function rather than an inline arrow, so its identity is
 * stable across renders and cannot drift from apps/web's.
 *
 * No endpoint overrides. Vercel injects this app's beacon paths at
 * build time via `NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG`, so
 * the deployed bundle uses a project-unique path rather than the
 * package's `/_vercel/insights/*` fallback — a local build shows the
 * fallback, because the variable only exists on Vercel.
 *
 * This app's deployment serves both, which is what lets the proxied
 * quiz routes report here too: apps/web is a Vite SPA that cannot read
 * that variable, so it emits origin-relative beacons that land on this
 * origin. That is deliberate — the landing page and the quiz are two
 * steps of one funnel. The reasoning, the measurements, and the one
 * risk it carries are in
 * [`docs/tracking/analytics-strategy.md`](/docs/tracking/analytics-strategy.md)
 * "Beacon routing across the cross-app proxy" — read that before
 * adding `viewEndpoint` / `eventEndpoint` / `scriptSrc` here, because
 * those props would split the funnel across two datasets rather than
 * fix anything.
 */
export function AnalyticsMount() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
