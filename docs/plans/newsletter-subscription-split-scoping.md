# Scoping — Newsletter subscription split from feedback table

## Status

In draft. Cross-cutting scoping doc — the subject (a newsletter
subscription store and its write-through from the feedback form)
spans the madrona-feedback epic's data shape and a yet-unscoped
standalone newsletter-signup feature, so this doc does not file
under a single epic. Filed at the cross-cutting top-level location
per [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
"In-Repo Layout Convention" (`docs/plans/<name>.md` for
cross-cutting plans not bound to a single epic). Promotion to
`Proposed` runs the
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"`In draft` → `Proposed` promotion gate" walk before the flip.

## Context

The recent feedback hardening migration
([`supabase/migrations/20260509000000_add_submit_feedback_rpc.sql`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql))
routed the anon write path through a SECURITY DEFINER RPC but did
not reshape the underlying table. Reading that diff surfaced a
structural issue in the M1 schema at
[`supabase/migrations/20260506000000_add_feedback_tables.sql:50-67`](/supabase/migrations/20260506000000_add_feedback_tables.sql):
`public.feedback_submissions` carries two lifecycles on a single
row.

- **One-shot event reaction.** Ratings, free text, and the optional
  email-for-followup are tied to one specific submission event and
  carry no meaning outside that event. This is the row's natural
  shape.
- **Ongoing subscription.** The `newsletter_opt_in boolean` on the
  same row encodes a long-lived "yes, send me future emails"
  relationship that should outlive the feedback row. A feedback row
  correctly retained as historical event data may correspond to an
  attendee who later unsubscribed; conversely, a feedback row later
  purged for PII redaction or abuse cleanup should not delete the
  consent record. The current shape couples the two in a way that
  forces either-both-or-neither retention.

The maintainer-agreed direction is to ship a standalone newsletter
signup feature as a peer surface to the feedback form, and reshape
the feedback form's opt-in into a write into the same subscription
store rather than a column on `feedback_submissions`. The standalone
signup feature itself is a separate scoping pass — this doc resolves
the data-shape questions that bind both surfaces so the standalone
signup's eventual scoping inherits a settled write-through contract
rather than re-litigating it.

## Why now

- The feedback table is freshly landed (migration timestamped
  2026-05-06) and has not yet served a real event. Reshaping the
  column posture before any production-significant data accumulates
  is cheaper than after — strong enough that Decision 3 is able to
  resolve to "no backfill," since there are no existing consent
  records worth preserving.
- The recent hardening pass is the natural moment to surface
  structural follow-ups against the same table; the maintainer
  flagged the lifecycle conflation while reviewing that diff.
- A standalone signup surface is on the near-term horizon as its
  own scoped feature. Settling the subscription-store shape now
  means that feature opens with a contract to anchor on rather than
  re-deriving it under time pressure.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the source
that proves the load-bearing claim. Decisions are absorbed into
whatever plan doc follows; this scoping doc owns the deliberation
prose (rejected alternatives) for the lifetime of the discussion.

Per [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Decompose options into shapes before analyzing," every option below
is decomposed into the sub-shapes that materially change the
analysis before being scored.

### 1. Source of truth — subscription table is canonical, feedback writes through [Resolved → Option A]

**What was decided.** The new subscription table is the canonical
record of "this email has agreed to receive newsletter emails."
The feedback form's opt-in checkbox emits a write-through into that
table when an attendee opts in. The `feedback_submissions` row
retains a denormalized boolean as audit trail (see Decision 5).

**Why it mattered.** This is the load-bearing axis: every other
shape decision (column set, write path, backfill posture) reads
differently depending on which surface owns the canonical record.

**Options considered.**

1. **Subscription table is canonical (Option A).** The subscription
   store is the single source of truth for "is this email a current
   subscriber." The feedback form's opt-in is one of multiple
   surfaces that can write into it; queries about "who is currently
   subscribed" run against the subscription table only.
2. **Feedback row is canonical, subscription is derived (Option
   B).** The feedback row carries the consent fact; a view, trigger,
   or ETL job projects subscriptions for newsletter-delivery
   purposes. The subscription store is a cache; deleting a feedback
   row deletes the corresponding subscription on next projection.

**Came down to.** The lifecycle divergence the maintainer named.
Under Option B, deleting a feedback row for PII redaction
necessarily deletes the consent record; the only escape is to
treat the projected subscription store as authoritative *after*
projection, at which point B has degenerated into A with extra
steps. Under Option A, feedback purge and unsubscribe are
independent operations against independent rows, which matches the
two lifecycles' natural cardinalities (a single attendee may
submit feedback once and stay subscribed for years; another may
submit feedback every event without ever opting in).

A second consequence: the standalone signup surface, when it
ships, has no feedback row to derive from. Under B that surface
would have to either invent a synthetic feedback row or fork the
"is this email subscribed" reads to consult two sources. Under A
the standalone surface and the feedback form are peer writers
into one canonical store; reads are uniform.

**Resolution.** Option A. The new subscription table is canonical;
feedback emits a write-through.

### 2. Subscription-table shape — composite (event_slug, email) primary key, event_slug standing in for an org/tenant concept until one exists [Resolved → Option C, with explicit org-stand-in framing]

**What was decided.** Composite primary key on `(event_slug,
email-normalized)`. Every subscription is event-scoped because every
public surface that produces one is event-scoped — the feedback form
lives at `/event/<slug>/feedback`, and the future standalone signup
widget will live somewhere under `/event/<slug>/*` for the same
reason every public surface in this product does. There is no
slug-less subscription shape to model. Per-event consent is recorded
per-event; the same email opting in to Madrona '26 and Madrona '27
is two rows, two consents, two unsubscribe entry points — that's
correct, not a bug. `event_slug` stands in for the org/tenant unit
of consent for now; if a future epic introduces a real multi-event-
host concept, it adds an `org_id` column (or equivalent) and the
unit of consent migrates without the per-event rows becoming wrong.

**Reframed from earlier scoping.** The first draft of this decision
chose a global-email-keyed shape (then-named D1) on the framing
"one canonical yes-or-no per email." That framing was wrong on two
fronts surfaced during review: (a) the product has no slug-less
surface, so a `source_event_slug = null` row is a shape that can't
be produced; (b) per-event consent IS the unit of consent in v1,
not a degenerate case of a global subscription. Reviewer Codex
caught one symptom directly — first-write-wins on a nullable
attribution column meant a hypothetical "standalone first, Madrona
feedback opt-in second" sequence would silently drop the second
event's row, and Madrona's per-event export would miss it. The
maintainer caught the deeper framing error: the wrong axis was
"global vs. per-event" when the right axis was "what's the unit of
consent." Composite-PK eliminates the whole class of bug; the
specific Codex case can't occur because both writes carry
`event_slug = 'madrona'` and resolve to the same row under ON
CONFLICT.

**Why it mattered.** The shape choice locks how the standalone
signup feature, the feedback write-through, per-event organizer
exports, and any future organizer operations compose. Picking the
wrong unit of consent forces either a forward migration that has
to reconstruct per-event consent records that were never collected,
or a v1 that silently misclassifies opt-ins.

**Options considered.**

1. **Composite (event_slug, email-normalized) PK; per-event
   consent unit (Option C, with org-stand-in framing).** One row
   per (event_slug, email) pair. Same email across two events =
   two rows. Per-event export is a primary-key range scan. The
   `event_slug` column stands in for an org/tenant unit until a
   future epic introduces one.
2. **Global table, single row per email (Option D).** Email is
   the primary key; source attribution columns capture origin.
   Decomposes into:
   - **D1.** Nullable `source_event_slug` column, first-write-
     wins on attribution. Rejected: relies on a slug-less surface
     that doesn't exist in this product, and produces the
     attribution-loss bug Codex flagged.
   - **D2.** Composite primary key on `(email, source_surface)`;
     the same email can have multiple rows if it opted in through
     multiple surfaces.
3. **Email + history join table (Option E).** Email-keyed
   subscriber row plus a separate `subscription_events` table
   recording each opt-in moment.

**Came down to.** What the unit of consent actually is in v1, and
whether any of the global-keyed shapes carry their weight against
that reality.

- *Option C (chosen).* Matches the surface reality (every signup
  comes from an event-scoped page). "Give me the Madrona '26
  subscribers" is a primary-key range scan
  (`where event_slug = 'madrona'`). ON CONFLICT on
  `(event_slug, email)` makes "the same attendee opts in twice
  via different surfaces in the same event" a single-row no-op
  (or `last_seen_at` refresh). "Unsubscribe me from this event"
  is a single-row write. "Unsubscribe me from everything" is N
  writes today, which is correct under the per-event-consent
  framing — the user signed up N times, they unsubscribe N
  times. When a real multi-event-host concept emerges, an
  `org_id` migration adds it; per-event rows remain valid as
  audit. The Madrona '26 → '27 transition is two distinct lists
  rather than one shared list, which matches what consent
  semantics actually require ('27 attendees did not consent to
  receiving '26 emails and vice versa).
- *Option D1.* Already rejected above. The "one canonical yes-or-
  no per email" framing imported a global-newsletter mental model
  the product doesn't have.
- *Option D2.* Same surface-reality problem as D1: "the same
  email opted in through multiple surfaces" is a scenario, but
  in v1 those surfaces are all event-scoped, so the more
  meaningful axis is event, not surface. D2's composite key
  produces multiple rows per email keyed by surface alone (so
  "Madrona feedback" and "Madrona standalone widget" are two
  rows for the same event), which is the wrong granularity —
  it splits per-event consent across surfaces inside the same
  event.
- *Option E.* Two-table schema for a history feature with no
  v1 consumer. Same surface-reality problem.

**Resolution.** Option C, with the explicit org-stand-in framing.
Load-bearing columns the implementing plan will instantiate (final
names and types deferred to plan time):

- An `event_slug` column, NOT NULL, FK against
  `public.feedback_enabled_events(slug)` (re-using the registry
  that already gates feedback writes — see Reality-check inputs).
  When the standalone signup feature ships, its scoping pass
  decides whether to extend this registry, mint a sibling
  registry, or relax to free-form text; this scoping doc names
  the FK as the v1 default since every v1 surface is feedback-
  registry-gated anyway.
- An `email` column, NOT NULL, case-normalized at write time. The
  normalization shape (lowercase + trim, `citext`, or a `lower()`
  unique index) is a plan-level call; what's settled is that the
  same address with different casing is the same subscriber for
  the same event.
- The composite primary key over `(event_slug, email)`.
- A `subscribed_at` timestamp recording the first opt-in for
  this (event_slug, email) pair.
- A `source_surface` column ('feedback_form' for the feedback
  write-through, 'standalone' for the standalone signup widget
  when it ships). No longer load-bearing for query semantics
  under composite-PK — kept as audit signal recording which
  surface produced this row. Closed at the application layer;
  DB-level CHECK is plan-level.
- A `confirmation_status` column (see Decision 7 for the value
  set), per-row so each (event_slug, email) pair carries its
  own confirmation lifecycle.
- A nullable `unsubscribed_at` timestamp. Setting it removes the
  row from "active subscribers for this event" queries; deleting
  the row is reserved for hard PII redaction. Re-subscribe after
  unsubscribe is plan-level: cleared timestamp on the existing
  row, or new row replacing the old one — the two shapes have
  different audit characteristics and the plan picks.

The table is RLS-locked to service-role writes plus organizer/admin
read; the read predicate is `is_organizer_for_event` against the
event identified by `event_slug` or `is_root_admin` — the same
posture used by `feedback_submissions` at
[`supabase/migrations/20260506000000_add_feedback_tables.sql:89-98`](/supabase/migrations/20260506000000_add_feedback_tables.sql),
which now applies cleanly because every row carries a non-null
`event_slug`. Writes from the public surfaces go through the
internal SECURITY DEFINER helper named in Decision 4.

### 3. Backfill — none; existing rows (if any) stay as audit-only on `feedback_submissions` [Resolved → Option G, simplified per maintainer direction]

**What was decided.** No backfill SQL in the implementing migration.
Pre-migration `feedback_submissions` rows where `newsletter_opt_in =
true` keep that flag set but do not propagate to the new
subscription table. Fresh post-migration submissions write both the
feedback row's audit flag (per Decision 5) and a subscription row
(via the helper from Decision 4); the new subscription store starts
populated only by the helper, never by direct backfill SQL.

**Maintainer direction recorded inline.** Earlier drafts of this
decision picked Option F (migration-time backfill) on the rationale
that forward-only would lose real consent records. The maintainer
direction at scoping time is that there's no production data worth
preserving — the feedback table has not yet served a real event,
and any rows present are test traffic. Under that constraint, the
simplest path wins: skip the backfill SQL entirely. Truncating the
table first is offered as an alternative the implementing pass may
pick if a clean-slate state is preferred over a leave-existing-rows
state, but neither is materially different for the v1 outcome.

**Why this is consistent with Decision 5.** Decision 5 frames
`newsletter_opt_in` on `feedback_submissions` as a snapshot of
intent at submission moment that may diverge from current
subscription state. A pre-migration row with `newsletter_opt_in =
true` and no corresponding subscription row is a valid state under
that framing — it's a snapshot of "they opted in at this submission
moment, before the canonical subscription store existed." No drift
correction needed; the audit semantic absorbs the unmigrated rows
cleanly.

**Options considered.**

1. **Migration-time backfill (Option F).** Insert subscription
   rows for every `newsletter_opt_in = true` feedback row at
   migration apply. Initially picked on the (then-correct)
   rationale that real consent records shouldn't be lost. Becomes
   over-engineering once the maintainer confirms there are no
   such records to preserve.
2. **Forward-only, no backfill SQL (Option G).** New subscription
   rows only land from opt-ins after the migration. Pre-existing
   feedback rows keep their `newsletter_opt_in` boolean as
   audit-only signals consistent with Decision 5.
3. **Truncate `feedback_submissions` in the migration (Option G',
   variant).** Same as G but adds an explicit `truncate
   public.feedback_submissions` step before creating the
   subscription table. Yields a guaranteed-clean starting state
   at the cost of a destructive verb in the migration.
4. **Backfill plus distinct backfill marker (Option H).** Same as
   F but with a sentinel value flagging backfilled rows. Rejected
   under any of the above framings — premature flexibility.

**Resolution.** Option G. The implementing migration creates the
new subscription table, the internal helper, and the
`submit_feedback` body update without any data-movement SQL. The
implementing pass may instead pick Option G' (add a `truncate`
step) if it judges a clean-slate start to be operationally
clearer; both options satisfy the scoping resolution. The
implementing plan owns whichever SQL it picks; this doc does not
draft it.

### 4. Write path from feedback — synchronous write through an internal SECURITY DEFINER helper, called from surface-specific public RPCs [Resolved → Option L, internal-helper variant]

**What was decided.** The feedback RPC's existing INSERT is wrapped
in a single transaction with a call to a shared subscription-write
helper. The same helper is the write entry point for the eventual
standalone signup RPC. ON CONFLICT semantics inside the helper
ensure duplicate-email opt-ins are no-ops on the subscription side
without failing the feedback insert. **The helper is internal —
not granted to anon or authenticated.** Public callers reach the
helper only through surface-specific SECURITY DEFINER RPCs
(`submit_feedback` for the feedback flow; a future
`submit_newsletter_signup` for the standalone signup flow), each
of which hardcodes its own `source_surface` value and constrains
its own `source_event_slug` shape before calling the helper.

**Why it mattered.** Naming the transactional shape and the
public-vs-internal API boundary now closes off the failure-mode
and abuse-mode surface areas; deciding either later means the
implementing plan inherits a multi-shape decision rather than a
contract.

**Options considered.** Per the "Decompose options into shapes"
rule, the "shared helper" framing was decomposed twice — first by
transactional shape, then by public/internal API boundary, since
the second axis materially changes the abuse surface:

1. **Inline write inside `submit_feedback` (Option I).** The RPC
   body is extended to insert into both tables inline; no shared
   helper. The standalone signup RPC, when it ships, would
   re-implement the subscription INSERT.
2. **Per-surface helpers, no shared transaction (Option K1).**
   Each surface has its own helper function; both helpers do the
   same thing but live separately. Feedback's helper is called
   inside `submit_feedback`'s transaction; standalone's is
   called inside the standalone RPC's transaction.
3. **Shared helper, called inside each caller's transaction
   (Option L).** A single `subscribe_email(p_event_slug, p_email,
   p_source_surface)` SECURITY DEFINER helper. The
   composite-PK shape from Decision 2 makes both `p_event_slug`
   and `p_email` required; `p_source_surface` is the audit-only
   surface attribution. Decomposes into:
   - **L-public.** Helper is granted EXECUTE to anon and
     authenticated. Surface-specific RPCs are convenience
     wrappers; anon callers may also call the helper directly.
   - **L-internal.** Helper has EXECUTE revoked from public,
     anon, and authenticated. Reachable only from inside other
     SECURITY DEFINER functions whose effective role is the
     function owner. Surface-specific RPCs (`submit_feedback`
     and a future `submit_newsletter_signup`) are the only
     public API; each hardcodes its own `source_surface`.
4. **Async event with eventual consistency (Option J).** The
   feedback RPC inserts into `feedback_submissions` only; a
   trigger or background job propagates to the subscription
   table. The standalone signup writes directly.

**Came down to.** Where the subscription-write rules live (one
place vs. drifting copies), what the failure mode looks like when
the subscription write fails, and — at the L sub-shape level —
who controls the source-attribution columns.

- *Option I.* Logic duplication is the dominant cost: the moment
  the standalone surface ships, the rules (normalization, ON
  CONFLICT semantics, default confirmation_status) live in two
  places. The recurring trap of two surfaces silently disagreeing
  about what subscribing means is exactly what the
  "no-business-rule-duplication" guardrail in
  [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  pushes against.
- *Option K1.* Better than I but worse than L: the two helpers
  exist to share rules, but the actual sharing is by convention
  not by callsite. Same drift risk, dressed up.
- *Option L-public.* The category-level "shared helper" answer,
  rejected on abuse grounds. Even with the composite-PK shape
  from Decision 2 narrowing the helper signature to
  `(p_event_slug, p_email, p_source_surface)`, two of those
  three parameters are still attacker-controlled when invoked
  directly: a hostile anon caller could pick an `event_slug`
  for any feedback-registered event they want to claim
  consent against, and stamp `p_source_surface = 'feedback_form'`
  to forge "they opted in via the feedback form" without ever
  going through `submit_feedback` (or the inverse: stamp
  `'standalone'` to forge a signup the standalone surface
  never produced). The `submit_feedback` RPC at
  [`supabase/migrations/20260509000000_add_submit_feedback_rpc.sql:27-58`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql)
  is correctly granted to anon because its parameter set is
  closed against this class of attack (`p_event_slug` is FK-
  gated by `feedback_enabled_events` so only registered slugs
  are accepted, and the remaining parameters describe a feedback
  row's content — there is no surface-attribution choice for
  the caller to make); the analogy does not transfer to a
  helper that takes `p_source_surface` as a parameter at all.
- *Option L-internal.* One helper, one set of rules, two
  callers — but the public API is the surface-specific RPCs,
  not the helper. The helper bypasses RLS via SECURITY DEFINER;
  the surface-specific RPCs each control their own attribution
  by hardcoding `p_source_surface` (literal in the RPC body,
  not from a parameter) and pass `p_event_slug` from their own
  already-gated input — for feedback, the same `p_event_slug`
  the surrounding `submit_feedback` body uses, gated by the FK
  in
  [`supabase/migrations/20260506000000_add_feedback_tables.sql:52-53`](/supabase/migrations/20260506000000_add_feedback_tables.sql);
  for the future standalone surface, whatever its scoping pass
  decides (likely the same FK-gated slug, since the standalone
  widget renders on event pages). ON CONFLICT on `(event_slug,
  email)` inside the helper handles duplicate opt-ins (same
  attendee opts in twice for the same event via different
  surfaces) as no-ops or as a `last_seen_at` refresh —
  plan-level call. Failure of the subscription INSERT rolls
  back the feedback INSERT — a consistency guarantee that
  matches user expectation: "submit feedback with newsletter
  checked" should not produce a feedback row claiming opt-in
  alongside a missing subscription row. The internal-only grant
  posture is enforced by `revoke execute on function … from
  public, anon, authenticated`; no matching `grant` is issued
  for those roles.
- *Option J.* The async path exposes a window where the feedback
  admin surface says "X opted in" while the subscription store
  doesn't list them. For v1 with manual newsletter export, that
  window is operationally bad — the organizer reading either
  surface during the gap sees an inconsistent state. The
  complexity of background-job retry semantics is paid for no
  v1 benefit. The async shape is a reasonable v2+ if subscription
  writes ever need to fan out to external systems (e.g.,
  Mailchimp), but at that point the trigger is the external
  fan-out, not the cross-table consistency, and the design space
  reopens.

**Resolution.** Option L-internal. The implementing plan defines
the helper's full signature and ON CONFLICT semantics; this doc
names the parameter shape (`p_event_slug`, `p_email`,
`p_source_surface` — the composite-PK columns from Decision 2 plus
the audit-only surface attribution), the public API contract
(surface-specific RPCs are the boundary; the helper is internal-
only), and the grant posture (`revoke execute … from public, anon,
authenticated`; no `grant execute … to anon, authenticated` is
issued). `submit_feedback`'s body is extended to call the helper
inside its existing transaction with `p_event_slug = p_event_slug`
(passing through the already-FK-gated value the existing INSERT
uses), `p_email = p_email` (passing through the same email value
the feedback row INSERT writes), and `p_source_surface =
'feedback_form'` (literal, not from a parameter). The standalone
signup feature, when scoped, ships its own public SECURITY
DEFINER RPC that calls the helper with `p_source_surface =
'standalone'` (literal); its `p_event_slug` shape is settled in
that scoping pass. The set of permissible `source_surface` values
is enforced at the public-RPC boundary (each RPC hardcodes one
literal); a CHECK constraint on the subscription table is a
defense-in-depth option the implementing plan may add but is not
the primary gate.

### 5. Feedback-row audit flag — keep `newsletter_opt_in` as a denormalized audit signal [Resolved → Option N]

**What was decided.** The existing
`feedback_submissions.newsletter_opt_in` boolean stays. Its semantics
are clarified to "the attendee asserted opt-in at the moment of
this submission," which may differ from the current state of the
subscription store (e.g., they later unsubscribed). The CHECK
constraint
`feedback_submissions_newsletter_opt_in_requires_email` at
[`supabase/migrations/20260506000000_add_feedback_tables.sql:62-66`](/supabase/migrations/20260506000000_add_feedback_tables.sql)
remains in force — you cannot audit-flag a subscription against a
row with no email. No FK from feedback row to subscription row.

**Why it mattered.** Without an audit signal, deleting a
subscription row (PII redaction or unsubscribe-via-deletion) erases
the historical fact "this attendee opted in via the feedback
surface at this submission moment." With an FK, the foreign-key
side of that deletion has to either cascade or restrict; both have
sharp edges (cascade hides the audit, restrict blocks legitimate
deletes).

**Options considered.**

1. **Drop `newsletter_opt_in` from `feedback_submissions` entirely
   (Option M).** The subscription store is the only record of opt-
   in. Feedback rows say nothing about subscription state.
2. **Keep `newsletter_opt_in` as a boolean denormalized audit
   (Option N).** The column persists; semantics change from "is
   this email subscribed" to "did this attendee assert opt-in at
   this submission moment."
3. **Replace the boolean with an FK to the subscription row
   (Option O).** Strongest referential integrity; the feedback
   row points at the subscription it caused.

**Came down to.** Whether the feedback row should be able to
truthfully record an opt-in moment that has since been reversed
(unsubscribed), and what happens at PII purge time.

- *Option M.* Loses the moment-in-time audit. If the organizer
  reads feedback later and sees a row with `email = null` and
  `email_declined = true`, that is unambiguous. If the organizer
  reads a row with `email` present and wants to know whether the
  attendee opted into the newsletter at that moment, M offers no
  answer — the subscription store may not list them now (they
  unsubscribed) but did then, and the feedback record is silent.
- *Option N.* The denormalized boolean is a snapshot, intentionally
  out of sync with the canonical store. Reading it answers "did
  they opt in at this moment"; reading the subscription store
  answers "are they currently subscribed." Two rows, two facts.
  PII purge of a feedback row leaves the subscription row alone;
  unsubscribe leaves the feedback row alone. The CHECK constraint
  carries forward unchanged because the invariant ("can't audit
  opt-in without an email") still holds.
- *Option O.* The FK creates a write-order coupling: subscription
  row must exist before feedback row, which is fine under the
  synchronous write-through (Decision 4) but adds rigidity. PII
  redaction of a subscription row either cascades (audit lost,
  same as M) or restricts (cannot redact while feedback rows
  reference). Both are operationally worse than N. The
  referential-integrity benefit is paid for no use case beyond
  what N already covers.

**Resolution.** Option N. The implementing migration does not
modify `newsletter_opt_in`'s shape on `feedback_submissions`. A
header comment on the table or column documents the snapshot
semantics so future readers don't mistake it for the canonical
subscription state — exact wording is plan-level.

### 6. Future-feature absorption — feedback + subscription is anticipated to be one plugin under the platform's plugin architecture, full scoping deferred to that pass [Carryover]

**What this scoping doc resolves.** The contract surface for the
standalone signup is a separate, surface-specific public SECURITY
DEFINER RPC (working name `submit_newsletter_signup`) granted to
anon and authenticated. That RPC's body calls the internal
`subscribe_email` helper from Decision 4 with `p_source_surface =
'standalone'` (hardcoded literal in the RPC body, not a parameter)
and a `p_event_slug` argument that resolves to the event slug the
standalone widget renders against (the widget is rendered on event
pages because every public surface in this product is event-
scoped per Decision 2's framing; null is not a value the helper
accepts under the composite-PK shape). Per Decision 4's
resolution, the helper is internal — anon does not call it
directly. The helper signature, the source-surface literal set
('feedback_form', 'standalone'), and the subscription table
composite-PK shape (Decision 2) are settled here so any later
surface that ships against this data inherits a contract rather
than co-designing with this work.

**What is deferred — and the absorbed scope is larger than the
standalone signup alone.** A platform-wide plugin-architecture
framing is in active scoping (separately tracked) under which
`apps/site` is the canonical product origin and the existing
`apps/web` game deployment is the first plugin. Under that
framing, feedback + subscription is anticipated to be a sibling
plugin — one module that owns the feedback page, the standalone
signup page, an embeddable email-entry widget exportable to
event homepages, the data tables, and the future organizer-facing
data-export and analysis tools. The "standalone signup feature's
own scoping pass" earlier drafts of this doc named is more
accurately framed as the **feedback + subscription plugin's own
scoping pass**: a single absorbed surface that this scoping doc
is upstream of.

Specifically deferred to that pass:

- The plugin's overall shape — what it owns vs. what it imports
  from the platform (auth, theming, registry conventions).
- The plugin's UI surfaces — the standalone signup page, the
  embeddable widget's API and embedding mechanism (component
  export, iframe, runtime federation), the feedback page's
  relocation into the plugin namespace.
- Where the plugin's RPCs and tables physically live in the
  database (shared `public.*` schema vs. a plugin-specific
  schema namespace) — see Plan structure handoff below for the
  sequencing implication.
- The plugin's organizer-facing data-export and analysis tools.
- The trigger for shipping any individual surface and the
  per-surface UX details (copy, validation feedback,
  double-submit handling, confirm flows).
- For the standalone signup specifically: whether the public RPC
  takes the `event_slug` from its URL path (widget renders at
  `/event/<slug>/...` and pulls the slug from route params),
  from a hidden form field populated by the rendering server
  component, or via some other mechanism. The helper itself
  always receives a non-null `p_event_slug` per Decision 2's
  composite-PK shape; what's deferred is how the surrounding
  public RPC obtains it.

The data-shape and write-contract decisions in this doc bind
regardless of where the plugin scoping lands those decisions,
and regardless of whether the implementing PR for *this* scoping
ships in `public.*` today or in a plugin namespace later (see
Plan structure handoff).

### 7. Compliance posture — single opt-in v1, schema forward-compatible for double opt-in [Resolved]

**What was decided.** v1 ships with single-opt-in semantics: an
attendee checking the box and submitting is recorded as a
subscriber and may receive newsletter emails. No email-confirmation
round-trip is required pre-delivery in v1. The subscription
table's `confirmation_status` column carries values that allow
double-opt-in to be added in a future migration without reshaping
the table — values along the lines of `unconfirmed`, `confirmed`,
`legacy_single_opt_in` (the implementing plan picks the exact set
and CHECK encoding). v1 reads treat `unconfirmed` and `confirmed`
as deliverable; a future tightening adds the gate.

Unsubscribe in v1 is a row-level `unsubscribed_at` timestamp.
Setting it removes the email from active-subscriber queries while
preserving the consent audit trail. Hard deletion is reserved for
PII redaction requests. The unsubscribe surface itself (admin tool,
self-service link, manual) is not scoped here — the plan
implementing this work names whatever the v1 path is, but the
column is in the schema from day one.

**Why it mattered.** The compliance shape governs whether the
standalone surface needs an email-sending pipeline at v1 launch
and whether the schema must accommodate a confirmation step from
day one.

**Came down to.** The epic-level Risk Register entry "Newsletter
consent is load-bearing legally" at
[`docs/plans/epics/madrona-feedback/epic.md:474-481`](/docs/plans/epics/madrona-feedback/epic.md)
already locked the consent posture: opt-in (default unchecked,
explicit affirmative action), with the organizer's downstream
newsletter tool respecting unsubscribes. That is single-opt-in
semantics. Double-opt-in is the GDPR/CAN-SPAM gold standard but
requires an email-sending pipeline the platform does not have and
the feedback epic explicitly defers
([`docs/plans/epics/madrona-feedback/epic.md:514-516`](/docs/plans/epics/madrona-feedback/epic.md):
"manual export by the organizer post-event. No automated sync to
a newsletter tool from this epic"). Tightening to double-opt-in
later is a forward migration the schema accommodates; reversing
from double to single is the migration that would be awkward.

**Resolution.** Single opt-in v1, with a `confirmation_status`
column whose value set is plan-level but explicitly designed to
accept a `confirmed`-vs-`unconfirmed` distinction without
reshaping. Unsubscribe via `unsubscribed_at` timestamp from day
one.

## Plan structure handoff

This scoping doc resolves all seven open questions named in the
maintainer's framing; no Open Decisions remain for plan-drafting
to resolve. Whether the next step is a phase plan doc or direct
implementation is a maintainer decision.

If the next step is a plan doc, the natural shape is one cross-
cutting plan at the same top-level location (alongside this
scoping doc), since the implementing PR touches the
madrona-feedback epic's table without belonging to that epic's
milestone structure. The plan would own: the new subscription-
table migration, the internal `subscribe_email` helper RPC
(SECURITY DEFINER, EXECUTE revoked from public/anon/authenticated
per Decision 4), the `submit_feedback` RPC body update to call
the helper with hardcoded `p_source_surface = 'feedback_form'`,
the regenerated `shared/db/types.ts`, and any clarifying comments
on `feedback_submissions.newsletter_opt_in`'s snapshot semantics.
Per Decision 3, no backfill SQL is needed; the implementing pass
may add a `truncate public.feedback_submissions` step if it
prefers a clean-slate state, but that's a destructive verb that
requires its own review attention rather than landing silently.
The standalone signup public RPC and any UI shipping the
standalone surface (or any other surface absorbed into the
feedback + subscription plugin) are *not* in scope for that plan
— they belong to the plugin's own scoping pass per Decision 6.

If the next step is direct implementation, the same scope applies;
the implementing PR carries its own contract via the diff.

**Namespace placement under the in-flight plugin architecture.**
The scoping above is written in `public.*` schema and current-
architecture language because that is what the codebase contains
today. A plugin-architecture framing is in active scoping
(separately tracked); under it, feedback + subscription is
anticipated to be its own plugin owning a plugin-specific schema.
Two paths the implementing pass picks between based on actual
state at implementation time:

- **Land in `public.*` now, mechanical migration later.** Default
  if the plugin architecture has not produced concrete
  scaffolding (a settled namespace convention, a plan-doc
  contract for the feedback + subscription plugin, or migration
  shells the implementer can land into) by the time
  implementation opens. Future plugin scoping's job at that
  point is `ALTER SCHEMA` + RPC namespace move plus relocating
  the feedback page into the plugin's UI tree — mechanical, not
  a redesign. The seven shape decisions are invariant across the
  move.
- **Land directly in the plugin namespace.** Available only if
  the plugin scaffolding has settled enough that the
  implementing PR can land into it without adding scaffolding
  scope — i.e., the plugin namespace exists, the RPC-grant
  conventions are settled, the registry-FK target is named.
  Adding plugin-architecture scaffolding inside the implementing
  PR for this scoping would be scope creep against the seven
  decisions resolved here; that work belongs to the plugin
  scoping itself, not to this implementation pass.

The implementing pass walks the Reality-check inputs below
(specifically the plugin-framing-state check) before picking the
path.

## Recommended PR shape (non-binding)

Per the maintainer's framing, this scoping doc does not lock the
PR boundary. Initial read on shape, for the implementing plan or
direct PR to confirm or revise:

- **Single PR.** The migration (new subscription table + internal
  helper RPC), the `submit_feedback` body update to call the
  helper, the `shared/db/types.ts` regeneration, and any doc
  updates fit one cohesive review chunk well below the AGENTS.md
  ">5 distinct subsystems" or ">300 LOC of substantive logic"
  thresholds. Subsystems touched: SQL migration, RPC body,
  generated types, doc surface — four, not five.
- A split is unlikely to be justified given Decision 3's "no
  backfill" resolution; the implementing diff is bounded by
  schema + helper + RPC-body update, all of which are tightly
  coupled.

The implementing pass re-derives this against actual diff size per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"PR-count predictions need a branch test."

## Reality-check inputs the implementing plan must verify

These are the load-bearing claims this scoping doc rests on. The
implementing plan re-verifies each at plan time per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Reality-check gate between scoping and plan."

- **`feedback_submissions` shape and CHECK constraint set.** The
  current table definition is at
  [`supabase/migrations/20260506000000_add_feedback_tables.sql:50-67`](/supabase/migrations/20260506000000_add_feedback_tables.sql).
  Decision 5 leaves these unchanged; the plan re-confirms before
  drafting the migration.
- **`submit_feedback` RPC signature and body.** Currently at
  [`supabase/migrations/20260509000000_add_submit_feedback_rpc.sql:27-58`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql).
  Decision 4 calls for adding a helper invocation inside its
  transaction. The plan confirms the function's
  `security definer` posture is preserved and the grant set
  (anon, authenticated) at lines 60-65 is unchanged.
- **`feedback_enabled_events` registry contents and FK target
  reuse.** Registry currently contains a single seed for `madrona`
  ([`supabase/migrations/20260506000000_add_feedback_tables.sql:107-109`](/supabase/migrations/20260506000000_add_feedback_tables.sql)).
  Decision 2 reuses this registry as the FK target for the new
  subscription table's `event_slug` column, on the basis that
  every v1 surface that produces a subscription row is event-
  scoped against a feedback-registered event. The plan confirms
  the registry's lifecycle (when slugs get added / removed /
  renamed) accommodates a second downstream FK without
  introducing weird cross-table coupling at slug-rename time
  (the existing `on delete restrict` posture at line 53 already
  blocks slug deletion while feedback rows reference; the new
  FK extends that block to subscription rows, which is the
  intended behavior).
- **Generated types.** `shared/db/types.ts` reflects the current
  feedback table at
  [`shared/db/types.ts:86-126`](/shared/db/types.ts) and the
  current `submit_feedback` RPC at
  [`shared/db/types.ts:585`](/shared/db/types.ts). The plan
  regenerates these after the migration lands and verifies the
  feedback form
  ([`apps/site/app/event/[slug]/feedback/FeedbackForm.tsx:124-130`](/apps/site/app/event/[slug]/feedback/FeedbackForm.tsx))
  still typechecks against the regenerated types.
- **Epic Risk Register consent posture.** The "Newsletter consent
  is load-bearing legally" entry at
  [`docs/plans/epics/madrona-feedback/epic.md:474-481`](/docs/plans/epics/madrona-feedback/epic.md)
  and the "Newsletter delivery pipeline" Resolved Decision at
  [`docs/plans/epics/madrona-feedback/epic.md:514-516`](/docs/plans/epics/madrona-feedback/epic.md)
  bound Decision 7's single-opt-in posture. The plan confirms
  these are still authoritative at plan time and not superseded
  by a later epic update.
- **Architecture guardrails.** The
  no-business-rule-duplication and shared-source-of-truth rules in
  [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  motivate Decision 4's shared helper. The plan confirms the
  guardrail wording when drafting the helper's contract.
- **Helper grant posture (Decision 4 load-bearing claim).** The
  scoping resolution requires the implementing migration to
  REVOKE EXECUTE on `subscribe_email(...)` from `public, anon,
  authenticated`, with no matching `grant execute … to anon,
  authenticated` issued for the helper. This is the structural
  enforcement that prevents anon callers from bypassing the
  surface-specific public RPCs and writing arbitrary
  `source_surface` / `source_event_slug` attribution. Reality-
  check at plan time: confirm Postgres semantics that a SECURITY
  DEFINER function called from inside another SECURITY DEFINER
  function whose owner is the same role does not require the
  inner function to be granted to anon (the effective role is
  the function owner, not the calling user). If a plan-level
  test reveals otherwise, the helper grant posture must be
  revisited; do not silently grant EXECUTE to anon to make the
  call work.
- **Plugin-architecture framing state (namespace path
  selection).** Decision 6's carryover and the namespace-
  placement paragraph in Plan structure handoff both reference an
  in-flight plugin-architecture framing under which feedback +
  subscription becomes one plugin. The implementing pass checks
  whether that framing has produced concrete scaffolding by the
  time implementation opens — a settled plugin-namespace
  convention, a plan-doc contract for the feedback + subscription
  plugin, or migration shells the implementer can land into —
  and picks the namespace path accordingly: `public.*` today
  with a future mechanical migration, or directly into the
  plugin namespace if the scaffolding is ready. The shape
  decisions in this scoping are invariant across the choice;
  what the check determines is *where* the implementation lands,
  not *what* it implements.

## Out of scope for this scoping doc

- The feedback + subscription plugin's overall shape, UI surfaces
  (standalone signup page, embeddable email-entry widget, the
  feedback page's relocation into the plugin namespace),
  organizer-facing data-export and analysis tools, and the
  triggers / copy / UX details for any individual surface
  (Decision 6 carryover).
- The choice between landing this scoping's implementation in
  `public.*` today vs. directly in a future plugin namespace.
  See Plan structure handoff "Namespace placement under the
  in-flight plugin architecture" — the decision is made by the
  implementing pass based on plugin-framing-state at that time.
- The unsubscribe surface (admin tool, self-service link, or
  manual). The schema accommodates unsubscribe via
  `unsubscribed_at` from day one; how a row gets that timestamp
  set in v1 is a plan-level call or a deliberate deferral.
- Any organizer-facing read surface for the new subscription
  table beyond what madrona-feedback M2 already sketches at
  [`docs/plans/epics/madrona-feedback/m2-organizer-readable-surface.md`](/docs/plans/epics/madrona-feedback/m2-organizer-readable-surface.md)
  (which is `Deferred` and non-prescriptive per its Status
  block). When M2 reopens, its scoping reads against the new
  table shape rather than the current `newsletter_opt_in`
  column.
- Email-sending pipelines, double-opt-in confirmation flows, and
  any external-system fan-out (Mailchimp, etc.). The
  `confirmation_status` column is forward-compatible for
  double-opt-in but v1 does not implement it.
