import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { redactAnalyticsUrl } from "../../../shared/analytics";
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
 * The `/react` entrypoint, not `/next` — this is a Vite SPA. It has no
 * `REACT_APP_VERCEL_OBSERVABILITY_*` build variables to read, so it
 * falls back to the package's origin-relative default beacon paths.
 * That is the intended behavior here and not an oversight: on the
 * canonical origin these routes are proxied from apps/site, so
 * origin-relative paths put quiz pageviews in apps/site's dataset
 * alongside the landing pageviews they need to be compared against.
 * See [`docs/tracking/analytics-strategy.md`](../../../docs/tracking/analytics-strategy.md)
 * "Beacon routing across the cross-app proxy" before adding endpoint
 * overrides.
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
    <Analytics
      beforeSend={(event) => ({ ...event, url: redactAnalyticsUrl(event.url) })}
    />
  </React.StrictMode>,
);
