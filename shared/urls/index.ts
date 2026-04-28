/**
 * Public shared/urls entrypoint consumed by both apps/web and (later)
 * apps/site.
 *
 * `shared/urls/` owns the canonical route table, route matchers,
 * pathname normalization, and the post-auth `next=` allow-list. The
 * exported `routes` object is the single source of truth for every
 * cross-app URL family; per-app code never composes route strings
 * inline. `validateNextPath` is browser-only — see its JSDoc for the
 * server-side caveat.
 */
export {
  matchAdminEventPath,
  matchEventAdminPath,
  matchEventRedeemPath,
  matchEventRedemptionsPath,
  matchGamePath,
  normalizePathname,
  routes,
  type AppPath,
  type AuthNextPath,
} from "./routes.ts";
export { validateNextPath } from "./validateNextPath.ts";
