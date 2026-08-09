# Phase 1 — Origin admission at the edge-function boundary

**Status:** `Proposed`

One PR.

## Context

Parent task plan:
[`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md).
This phase satisfies the parent's C3 (origin admission precedes
anything that depends on it) and inherits its I1 and I3.

The organizer's domain is a distinct browser origin, and the edge
functions reject origins they do not recognize before any handler
logic runs. That rejection is why the Madrona quiz cannot mint a
check-in code on that host today — not at a short path, which does
not exist yet, and not at the long event path that already
circulates in QR codes and links. This phase is the smallest change
that makes the event work on the organizer's domain at all, and it
is worth landing on its own because it needs none of the routing
work the later phases do.

**Scoping-doc skip.** This phase invokes the narrow-surface
carve-out: it touches one subsystem (edge-function shared code),
well under the file-count bound, adds no new public-API contract or
route family, introduces no cross-cutting invariant of its own
(it consumes the parent's), and uses the allowlist mechanism already
in the codebase. Per that carve-out the reality-check inputs are
absorbed inline below rather than in a separate artifact.

## Goal

- A credentialed browser request from the organizer origin to the
  edge functions is admitted rather than rejected, on every function
  that gates on origin.
- The quiz is playable end to end from the organizer host at the
  event's existing long path, minting an `MIP-####` code.
- Requests from origins that are not allowlisted are still rejected,
  and every other admitted origin behaves as it does today.

## Contracts

### C1. The organizer origin is admitted in code, not by configuration

The organizer origin joins the built-in allowlist in
`supabase/functions/_shared/cors.ts`. It does not go in
`EXTRA_ALLOWED_ORIGINS`, which stays scoped to local and temporary
extras.

An allowlist is authorization surface, not a secret — every admitted
origin is echoed back in the response header regardless — so it
belongs where it is reviewed and diffable. The env var's shape
reinforces this: it is additive and cannot remove a built-in entry,
so it was never the place a launched origin was meant to live.

**Verified by:** `getAllowedOrigins` in that module unions the
built-in set with `EXTRA_ALLOWED_ORIGINS` and documents the additive
contract; the project's Edge Function Secrets page lists only
`SESSION_SIGNING_SECRET` and `APPS_SITE_VERCEL_SCOPE`, so the env var
is unset today and nothing depends on it.

### C2. Admission is only as complete as the deploy

Per the parent's I3: every deployable function that compiles the
allowlist in is redeployed together, and membership is resolved from
the **import graph** — not from a search for the CORS module's path.

Some functions reach the allowlist through a shared helper rather
than importing it themselves, so a path search under-reports and
silently drops them. This is not hypothetical; it is an error made
once while drafting this plan, which is why the contract is stated as
the whole deployed set rather than a roster that can go stale as
functions are added.

Redeploying only the function a probe exercises has two distinct
failure shapes, and neither surfaces until someone hits it. An
attendee passes session issuance, plays the entire quiz, and takes a
rejection at completion — the exact "cannot mint a code" symptom this
phase exists to remove, reintroduced one function later. An organizer
signs in and finds the authoring actions rejected the same way.

**Verified by:** `supabase/functions/_shared/authoring-http.ts`
imports `createCorsHeaders` and `getAllowedOrigin` from `./cors.ts`,
and the authoring functions consume that helper rather than the CORS
module directly; `complete-game` reaches it through its own
`dependencies.ts` and `response.ts`, and `createCompleteGameHandler`
returns a 403 on an unrecognized origin ahead of every other branch.
[`docs/dev.md`](/docs/dev.md) documents deployment as one
`functions deploy` invocation per function, with no all-functions
wrapper in `package.json` or `scripts/`.

## Reality-check inputs

Claims this phase rests on, to re-verify at implementation time
because they were established against systems that move
independently of the repo:

- **The deployed allowlist matches the repo.** The conclusion that
  the organizer origin is rejected was read from the deployed bundle,
  which matched `main` at the time. Re-confirm if any function has
  been deployed since.
- **`EXTRA_ALLOWED_ORIGINS` is still unset.** C1's framing depends on
  it. Re-read the secrets page before landing.
- **The function set.** Re-derive it from the import graph at
  implementation time rather than trusting any list, including this
  plan's prose.

## Files to touch

*Estimate of the expected shape, not a binding rule. Implementation
may revise any row when a structural call requires it; deviations are
reported per the Plan-to-PR Completion Gate's Estimate Deviations
callout.*

**Modify**

| file |
|---|
| `supabase/functions/_shared/cors.ts` |
| `tests/supabase/functions/cors.test.ts` |
| `docs/operations.md` |

**Intentionally not touched**

- `EXTRA_ALLOWED_ORIGINS` and any other Supabase secret — per C1.
- The preview-alias matcher and its scope env var. Organizer domains
  cannot match it, so widening it would add trust surface for no
  behavior change.
- Every routing, route-contract, and masthead surface. This phase is
  origin admission only; short paths arrive in later phases.

## Validation Gate

`npm run lint` plus:

- `npm run test:functions`, run from the main checkout — worktrees
  have no `node_modules`, and the Deno suite cannot resolve there, so
  a worktree run is not a signal. Do not read the result through a
  pipe; a piped run reports the filter's exit code rather than the
  suite's.
- **Post-deploy, per function.** A credentialed preflight and POST
  from the organizer origin returns that origin echoed in
  `Access-Control-Allow-Origin`, and the same request from an
  unlisted origin is still rejected — probed against every deployed
  function, with the set enumerated from the filesystem rather than
  from a written list. A single-function probe cannot distinguish
  "the allowlist is right" from "the allowlist is right and every
  function has it," and those two states differ by a live failure at
  quiz completion.
- **End to end on the organizer host.** The quiz is playable from the
  event's long path and mints an `MIP-####` code. This is the check
  that proves the phase delivered its goal rather than just its diff.
- **Unchanged elsewhere (parent I1).** The same quiz run on the
  canonical alias still works, and an unlisted origin is still
  rejected.

This phase's gate has no host-conditional routing in it, so unlike
the later routing phases it is not bound by the parent's
preview-URL constraint — but the post-deploy probes still run against
deployed functions, since a local suite cannot exercise a deploy.

## Self-Review Audits

From [`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Platform-auth-gate config audit** — this diff moves an admission
  boundary, which is exactly the surface that audit walks.
- **Validation-command coupling audit** — the gate above claims a
  per-function probe proves complete admission; this audit is the
  check that the named procedure exercises what it claims.

## Risks

**R1. The redeploy is the part with no test.** The code change is
covered by the Deno suite, but "every function was redeployed" is an
operational step with no automated gate. The per-function probe is
the compensating control, and it is why the gate enumerates the
function set from the filesystem rather than from prose.

**R2. Admission is necessary, not sufficient.** Landing this phase
makes the quiz work on the organizer host at the long path. Sign-in
initiated from that host still returns to the wrong origin until
phase 2 lands. Nothing here should be read as "the organizer host is
launched."

## Documentation Currency PR Gate

[`docs/operations.md`](/docs/operations.md) currently frames the
built-in allowlist as the canonical alias plus localhost. This phase
updates that framing and records that an allowlist edit is not live
until every function carrying it is redeployed — an operator reading
only the code diff has no way to infer the deploy scope from it.
