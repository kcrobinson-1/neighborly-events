import {
  matchAdminEventPath,
  matchEventRedeemPath,
  matchEventRedemptionsPath,
  matchGamePath,
  routes,
} from "../routes";
import type { AuthNextPath } from "./types";

/**
 * Validates a raw `next` query parameter against the allow-list of
 * post-sign-in destinations. Any input that fails to parse, points
 * cross-origin, or does not match a known router matcher falls back
 * to `routes.home`.
 *
 * Open-redirect defense lives here end-to-end. The function is pure
 * and side-effect free; the only browser API it touches is the URL
 * constructor (and `window.location.origin` for the same-origin
 * check).
 */
export function validateNextPath(rawNext: string | null): AuthNextPath {
  if (rawNext === null || rawNext.trim() === "") {
    return routes.home;
  }

  let parsed: URL;

  try {
    parsed = new URL(rawNext, window.location.origin);
  } catch {
    return routes.home;
  }

  if (parsed.origin !== window.location.origin) {
    return routes.home;
  }

  const pathname = parsed.pathname;

  if (pathname === routes.home) {
    return routes.home;
  }

  if (pathname === routes.admin) {
    return routes.admin;
  }

  if (matchAdminEventPath(pathname) !== null) {
    return pathname as AuthNextPath;
  }

  if (matchGamePath(pathname) !== null) {
    return pathname as AuthNextPath;
  }

  if (matchEventRedeemPath(pathname) !== null) {
    return pathname as AuthNextPath;
  }

  if (matchEventRedemptionsPath(pathname) !== null) {
    return pathname as AuthNextPath;
  }

  return routes.home;
}
