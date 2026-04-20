/**
 * Stable, local-only anchor for `scripts/doctor.sh`.
 *
 * Keep this import graph free of remote (`jsr:`/`https:`/`npm:`) dependencies
 * so doctor can run a deterministic offline `deno check --no-remote` preflight
 * without self-healing the cache over the network.
 */
export { sessionHeaderName } from "./session-cookie.ts";
