import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { redactAnalyticsEvent } from "../../../shared/analytics";
// Side-effect import: registers apps/web's `shared/auth/` providers
// (configureSharedAuth) once at startup, before any component that
// consumes a shared/auth symbol mounts. See ./lib/setupAuth.ts.
import "./lib/setupAuth";
// Side-effect import: registers apps/web's `shared/events/` providers
// (configureSharedEvents) once at startup, before any shared event API
// is consumed. See ./lib/setupEvents.ts.
import "./lib/setupEvents";
import App from "./App";
import "./styles.scss";

/** Root DOM node that hosts the React application. */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element for Neighborly web app.");
}

/**
 * Vercel Web Analytics for the quiz app, mounted as a sibling of
 * `<App />` rather than inside it: it renders no DOM and belongs to no
 * route, and a sibling cannot be unmounted by a route transition or
 * taken down with a route's error boundary.
 *
 * The `/react` entrypoint, not `/next` — this is a Vite SPA. That
 * choice decides where the data lands, so it is worth stating why the
 * defaults are left alone. The entrypoint looks for
 * `REACT_APP_VERCEL_OBSERVABILITY_CLIENT_CONFIG`; Vite exposes no
 * `REACT_APP_*` variables and no `process` in the browser, so this app
 * falls back to the package's origin-relative default beacon paths
 * (`/_vercel/insights/*`) rather than to the project-unique path Vercel
 * injects into a Next.js build — which is what apps/site gets.
 *
 * That asymmetry is load-bearing and wanted. On the canonical origin
 * these routes are proxied from apps/site, so an origin-relative beacon
 * resolves against apps/site and puts quiz pageviews in apps/site's
 * dataset, alongside the landing pageviews they exist to be compared
 * against. Setting `scriptSrc` / `viewEndpoint` here would split the
 * funnel across two projects, not fix anything.
 *
 * Read [`docs/tracking/analytics-strategy.md`](../../../docs/tracking/analytics-strategy.md)
 * "Beacon routing across the cross-app proxy" before touching this: it
 * records the measurements behind the claim, and the one condition
 * that would make an override the right call.
 *
 * `beforeSend` drops the URL fragment from every beacon, matching
 * apps/site so a row in the shared dataset means the same thing
 * whichever app produced it. See `redactAnalyticsUrl`.
 *
 * A blocked or failed beacon script leaves the quiz fully functional:
 * the component only queues into `window.va` and injects a `<script>`,
 * and neither the queue nor the injection throws when the script never
 * arrives.
 */
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    <Analytics beforeSend={redactAnalyticsEvent} />
  </React.StrictMode>,
);
