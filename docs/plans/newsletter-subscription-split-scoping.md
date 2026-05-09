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
  2026-05-06) and has not yet served Madrona '26 traffic. Reshaping
  the column posture before any production-significant data
  accumulates is cheaper than after — backfill volume is at most
  whatever Madrona '26 produces, not a multi-event corpus.
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

### 2. Subscription-table shape — global table with source attribution columns [Resolved → Option D1]

**What was decided.** One row per email (case-normalized), with
columns capturing where the subscription originated (surface and
optional event slug). Per-event "lists" are derived by query filter
on the source-event column rather than encoded as separate tables.
Final column types are deferred to the implementing plan; only the
load-bearing column set is scoped here.

**Why it mattered.** The shape choice locks how the standalone
signup feature, the feedback write-through, and any future organizer
operations (export per-event subscribers, unsubscribe an email
across all surfaces) compose. Picking a shape that makes a
plausible v2 use case impossible without migration is the trap.

**Options considered.**

1. **Slug-keyed per-event lists (Option C).** Composite key on
   `(email, event_slug)`; one row per (email, event) pair.
2. **Global table, single row per email (Option D).** Email is the
   primary key; source attribution columns capture origin.
   Decomposes into:
   - **D1.** First-write-wins on source attribution. The first
     surface that subscribes the email records its source; later
     opt-ins from a different surface are no-ops (or update
     `last_seen_at` only).
   - **D2.** Composite primary key on `(email, source_surface)`;
     the same email can have multiple rows if it opted in through
     multiple surfaces.
3. **Email + history join table (Option E).** Email-keyed
   subscriber row plus a separate `subscription_events` table
   recording each opt-in moment.

**Came down to.** What information about origin we actually need to
preserve, against the cost of preserving it.

- *Option C.* Slug-keyed lists make "give me the Madrona '26
  subscribers" a primary-key range scan, but they foreclose
  cross-event consolidation: the same email subscribed to two
  events is two rows with no link between them, "unsubscribe me
  from everything" is N writes, and the standalone signup
  surface (which has no event slug) needs a sentinel slug or a
  separate table. The Madrona '26 → '27 transition specifically
  would either inherit '26's list (one row per email per event,
  duplicated) or start fresh, neither of which the maintainer's
  framing wants.
- *Option D1.* The lightest shape that satisfies "one canonical
  yes-or-no per email, with attribution of where they entered."
  Per-event lists are recovered by `where source_event_slug =
  'madrona'`. The standalone surface writes rows with
  `source_event_slug = null`. Re-opting-in via a second surface
  is a no-op (the email is already a subscriber); the audit
  signal "this attendee opted in via the feedback form for
  Madrona '26" is preserved on the feedback row itself
  (Decision 5), not on the subscription row.
- *Option D2.* Worth carving out from the D family because the
  category name "global table" hides it. Records every opt-in
  surface separately for the same email. Pro: full multi-source
  history at the subscription store. Con: "is this email
  subscribed" becomes a `select … limit 1` rather than a primary-
  key lookup; "unsubscribe me" becomes N writes across all source
  surfaces; conflict semantics ("opted in via standalone, then
  opted in via feedback" — what does the row's confirmation
  status say?) need bespoke resolution. No v1 use case for the
  history beyond what the per-row audit on `feedback_submissions`
  already preserves.
- *Option E.* Same multi-source history concern as D2, paid in a
  more normalized form (one canonical row + a history join). Pro:
  "is subscribed" is a clean primary-key lookup against the
  subscriber row; history is a separate query. Con: two-table
  schema, two-table writes on every opt-in, two-table queries on
  every read. The benefit (history) has no v1 consumer.

**Resolution.** Option D1. Load-bearing columns the implementing
plan will instantiate (final names and types deferred to plan
time):

- An email column case-normalized at write time, primary key. The
  normalization shape (lowercase + trim, `citext`, or a `lower()`
  unique index) is a plan-level call; what's settled is that the
  same address with different casing is the same subscriber.
- A first-subscribed timestamp.
- A source-surface column carrying a small enumerated string
  ('feedback_form' for the feedback write-through, 'standalone'
  for the standalone signup surface). The set is closed at the
  application layer; whether the DB enforces it via CHECK or
  just by convention is a plan-level call.
- A nullable source-event-slug column. Set to the event slug for
  feedback writes; null for standalone signups not associated
  with any event. Whether to FK against
  `public.feedback_enabled_events` or carry a free-form text
  column is a plan-level call (see Reality-check inputs below
  for what determines the choice).
- A confirmation-status column (see Decision 7 for the value
  set).
- A nullable unsubscribed-at timestamp. Setting it removes the
  row from "active subscribers" queries; deleting the row is
  reserved for hard PII redaction. Re-subscribe after
  unsubscribe is plan-level: cleared timestamp on the existing
  row, or new row replacing the old one — the two shapes have
  different audit characteristics and the plan picks.

The table is RLS-locked to service-role writes plus organizer/admin
read in the same posture as `public.feedback_submissions` (read
gated on `is_organizer_for_event` or `is_root_admin`); writes from
the public surfaces go through the SECURITY DEFINER helper named
in Decision 4.

### 3. Backfill — migration-time backfill from existing feedback rows [Resolved → Option F]

**What was decided.** When the implementing migration applies, all
`public.feedback_submissions` rows where `newsletter_opt_in = true`
are inserted into the new subscription table with `source_surface =
'feedback_form'`, `source_event_slug = event_slug`, and
`subscribed_at = submitted_at`. The confirmation status applied to
backfilled rows is determined by Decision 7.

**Why it mattered.** Forward-only migration would silently lose any
existing newsletter consent records from the canonical store, even
though the consent itself was given. The compliance question is
real but resolves cleanly under Decision 7's posture.

**Options considered.**

1. **Migration-time backfill (Option F).** Insert subscription
   rows for every `newsletter_opt_in = true` feedback row at
   migration apply.
2. **Forward-only (Option G).** New subscription rows only land
   from opt-ins after the migration. Pre-existing feedback rows
   keep their `newsletter_opt_in` boolean as the only record.
3. **Backfill plus distinct backfill marker (Option H).** Same as
   F, but with an extra column or sentinel value flagging
   backfilled rows so they can be excluded from operations that
   should only apply to "fresh" opt-ins.

**Came down to.** The expected backfill volume and whether
backfilled rows differ semantically from forward rows.

- The feedback table landed 2026-05-06 (
  [`supabase/migrations/20260506000000_add_feedback_tables.sql:50-67`](/supabase/migrations/20260506000000_add_feedback_tables.sql)).
  Madrona '26 has not yet happened. At the moment the
  implementing migration applies, the row count is bounded by
  any test traffic plus whatever Madrona '26 produces between
  M1 and the implementation moment — practically dozens to low
  hundreds, not thousands. Backfill cost is trivial.
- *Option F.* The semantically correct shape if Decision 7
  resolves to single-opt-in (no double-opt-in confirmation).
  Backfilled rows carry the same confirmation_status as
  forward-written rows because the consent semantics they were
  collected under match what the new system enforces.
- *Option G.* Loses real consent records from the canonical
  store. The organizer's "manual newsletter export" workflow
  (epic Resolved Decision: "Newsletter delivery pipeline:
  manual export") would have to read both surfaces during the
  transition window, which is exactly the conflation this
  scoping aims to remove.
- *Option H.* Pays for a column that would only matter if
  forward and backfilled rows were treated differently
  downstream. They are not, under Decision 7's resolution.
  Premature flexibility.

If Decision 7 had resolved to "double-opt-in required v1," F
would not be straight-line: existing feedback rows were
collected under single-opt-in semantics and cannot be retro-
fitted with a confirmation event. In that world F still applies
but with `confirmation_status = 'legacy_single_opt_in'` (a
distinct sentinel), and the v1 newsletter pipeline would have to
either include those rows on grandfather rationale or omit
them. Decision 7 resolves to single-opt-in v1, which makes F
straight-line.

**Resolution.** Option F. Implementing migration backfills in the
same transaction that creates the subscription table, with
`source_surface = 'feedback_form'` and the existing
`submitted_at` carried forward as `subscribed_at`. Implementing
plan owns the SQL; this doc does not draft it.

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
   (Option L).** A single `subscribe_email(p_email,
   p_source_surface, p_source_event_slug)` SECURITY DEFINER
   helper. Decomposes into:
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
  rejected on abuse grounds. `p_source_surface` and
  `p_source_event_slug` are attacker-controlled inputs; granting
  EXECUTE to anon lets a hostile caller bypass the
  surface-specific RPCs entirely and write arbitrary attribution
  tuples — including impersonating the standalone surface from
  a feedback context, or claiming a `source_event_slug` for an
  event the attacker has no involvement with. The `submit_feedback`
  RPC at
  [`supabase/migrations/20260509000000_add_submit_feedback_rpc.sql:27-58`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql)
  is correctly granted to anon because its parameter set is
  closed (`p_event_slug` is FK-gated by
  `feedback_enabled_events`; remaining parameters describe a
  feedback row's content); the analogy does not transfer to a
  helper whose parameters include the source-attribution shape
  itself.
- *Option L-internal.* One helper, one set of rules, two
  callers — but the public API is the surface-specific RPCs,
  not the helper. The helper bypasses RLS via SECURITY DEFINER;
  the surface-specific RPCs each control their own attribution
  by hardcoding `p_source_surface` (and validating
  `p_source_event_slug` against their own surface's rules — for
  feedback, the slug must equal the event_slug already gated by
  the FK in
  [`supabase/migrations/20260506000000_add_feedback_tables.sql:52-53`](/supabase/migrations/20260506000000_add_feedback_tables.sql);
  for the future standalone surface, the slug is null or
  validated per that surface's design). ON CONFLICT semantics
  inside the helper handle duplicate-email opt-ins as no-ops or
  as a refresh of `last_seen_at` (plan-level call). Failure of
  the subscription INSERT rolls back the feedback INSERT — a
  consistency guarantee that matches user expectation: "submit
  feedback with newsletter checked" should not produce a
  feedback row claiming opt-in alongside a missing subscription
  row. The internal-only grant posture is enforced by `revoke
  execute on function … from public, anon, authenticated`; no
  matching `grant` is issued for those roles.
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
the helper's signature and ON CONFLICT semantics; this doc names
the public API contract (surface-specific RPCs are the boundary;
the helper is internal-only) and the grant posture (`revoke
execute … from public, anon, authenticated`; no `grant execute …
to anon, authenticated` is issued). `submit_feedback`'s body is
extended to call the helper inside its existing transaction with
`p_source_surface = 'feedback_form'` (literal, not from a
parameter) and `p_source_event_slug = p_event_slug` (the same
already-FK-gated value the existing INSERT uses). The standalone
signup feature, when scoped, ships its own public SECURITY
DEFINER RPC that calls the helper with `p_source_surface =
'standalone'` (literal) and whatever `p_source_event_slug` shape
that scoping pass settles on. The set of permissible
`source_surface` values is enforced at the public-RPC boundary
(each RPC hardcodes one literal); a CHECK constraint on the
subscription table is a defense-in-depth option the implementing
plan may add but is not the primary gate.

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

### 6. Standalone signup surface — anchor only, full scoping deferred [Carryover]

**What this scoping doc resolves.** The contract surface for the
standalone signup is a separate, surface-specific public SECURITY
DEFINER RPC (working name `submit_newsletter_signup`) granted to
anon and authenticated. That RPC's body calls the internal
`subscribe_email` helper from Decision 4 with `p_source_surface =
'standalone'` (hardcoded literal in the RPC body, not a
parameter) and whatever `p_source_event_slug` shape the standalone
scoping pass settles. Per Decision 4's resolution, the helper is
internal — anon does not call it directly. The helper signature,
the source-surface literal set ('feedback_form', 'standalone'),
and the subscription table shape are settled here so the
standalone feature inherits a contract rather than co-designing
with this work.

**What is deferred to the standalone signup scoping pass.**

- The standalone surface's UI shape — page, footer widget,
  embedded component, marketing modal, etc.
- The trigger for shipping it (which event or organizer ask
  motivates the first deploy).
- Whether the standalone public RPC accepts a
  `p_source_event_slug` parameter (for a per-event embed of the
  widget) or always passes null when calling the internal helper.
  Either way, the helper itself is reachable only through that
  surface-specific RPC, never via direct anon execute.
- Copy, validation feedback, double-submit handling, and any
  thank-you/confirm flow on the standalone surface.

These do not affect the data shape or write contract scoped here;
deferring them is safe.

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

**Why it mattered.** The compliance shape governs both the
backfill semantics (Decision 3) and whether the standalone surface
needs an email-sending pipeline at v1 launch.

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
per Decision 4), the backfill INSERT, the `submit_feedback` RPC
body update to call the helper with hardcoded
`p_source_surface = 'feedback_form'`, the regenerated
`shared/db/types.ts`, and any clarifying comments on
`feedback_submissions.newsletter_opt_in`'s snapshot semantics. The
standalone signup public RPC and any UI shipping the standalone
surface are *not* in scope for that plan — they belong to the
standalone signup feature's own scoping pass.

If the next step is direct implementation, the same scope applies;
the implementing PR carries its own contract via the diff.

## Recommended PR shape (non-binding)

Per the maintainer's framing, this scoping doc does not lock the
PR boundary. Initial read on shape, for the implementing plan or
direct PR to confirm or revise:

- **Single PR.** The migration (new subscription table + backfill +
  shared helper RPC), the `submit_feedback` body update to call
  the helper, the `shared/db/types.ts` regeneration, and any
  doc updates fit one cohesive review chunk well below the
  AGENTS.md ">5 distinct subsystems" or ">300 LOC of substantive
  logic" thresholds. Subsystems touched: SQL migration, RPC body,
  generated types, doc surface — four, not five.
- A split is justifiable only if the implementing pass surfaces
  unexpected backfill cardinality (it should not — the row count
  is bounded by current Madrona '26 traffic, which is near zero
  at scoping time per the migration's 2026-05-06 timestamp).

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
- **`feedback_enabled_events` registry contents.** Currently
  contains a single seed for `madrona`
  ([`supabase/migrations/20260506000000_add_feedback_tables.sql:107-109`](/supabase/migrations/20260506000000_add_feedback_tables.sql)).
  Decision 2's open question on whether the subscription table's
  `source_event_slug` FKs against this registry depends on whether
  the standalone signup will ever produce a non-feedback-event
  slug. Plan-level call.
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

## Out of scope for this scoping doc

- The standalone signup feature's UI shape, trigger, and copy
  (Decision 6 carryover).
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
