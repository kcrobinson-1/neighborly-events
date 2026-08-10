/**
 * Public `shared/analytics` entrypoint.
 *
 * Client-side analytics helpers shared by both apps. Everything here is
 * pure and vendor-type-free: the `@vercel/analytics` dependency lives
 * in the two app-level mount points (`apps/site/components/AnalyticsMount.tsx`
 * and `apps/web/src/main.tsx`), which compose these helpers into the
 * vendor's hooks.
 */
export {
  redactAnalyticsEvent,
  redactAnalyticsUrl,
} from "./redactAnalyticsUrl.ts";
