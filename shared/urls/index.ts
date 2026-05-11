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
  matchEventAdminPath,
  matchGamePath,
  matchGameRedeemPath,
  matchGameRedemptionsPath,
  normalizePathname,
  routes,
  type AppPath,
  type AuthNextPath,
} from "./routes.ts";
export { normalizeEventSlug } from "./normalizeEventSlug.ts";
export {
  EVENT_SLUG_MAX_LENGTH,
  EVENT_SLUG_PATTERN,
  EVENT_SLUG_RULE_MESSAGE,
  isValidEventSlug,
  validateEventSlug,
} from "./eventSlugShape.ts";
export { validateNextPath } from "./validateNextPath.ts";
