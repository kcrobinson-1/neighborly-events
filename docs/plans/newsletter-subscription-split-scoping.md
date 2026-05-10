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
- **Newsletter opt-in capture.** The `newsletter_opt_in boolean` on
  the same row encodes a consent record meant to be exported for
  the org's downstream mailing-list tool. That consent record
  should outlive the feedback row in some directions and be
  purgeable independently in others — a feedback row later purged
  for PII redaction or abuse cleanup should not delete the consent
  record (the export still owes the consent fact to the downstream
  tool), and the consent record persists for export use whether or
  not the feedback row remains. The current shape couples the two
  in a way that forces either-both-or-neither retention.

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
  2026-05-06, `Verified by:`
  [`supabase/migrations/20260506000000_add_feedback_tables.sql`](/supabase/migrations/20260506000000_add_feedback_tables.sql)).
  **Maintainer-attested assumption (recorded inline; not verifiable
  from in-repo state):** the table has not yet served a real event,
  so any rows present are test traffic. This assumption underwrites
  Decision 3's "no backfill" resolution; the implementing pass
  reality-checks production row count before locking in the
  no-backfill SQL — see Reality-check inputs.
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

### 1. Source of truth — opt-in capture table is canonical for the consent moment, feedback writes through [Resolved → Option A]

**What was decided.** The new opt-in capture table is the canonical
record within Neighborly of "this email opted in to a newsletter for
this event at this moment." Per Decision 7, Neighborly is not the
persistent maintainer of the org's mailing list — that role lives in
whatever tool the org imports the export into (Mailchimp is the v1
named case). So "canonical" here means canonical for the
event-bound consent capture, not for current-subscription state.
The feedback form's opt-in checkbox emits a write-through into the
capture table; the `feedback_submissions` row retains a
denormalized boolean as audit trail (see Decision 5).

**Why it mattered.** This is the load-bearing axis: every other
shape decision (column set, write path) reads differently depending
on which surface owns the canonical record of the opt-in.

**Options considered.**

1. **Opt-in capture table is canonical (Option A).** The capture
   table is the single source of truth within Neighborly for "this
   email opted in via Neighborly at this moment." The feedback form's
   opt-in is one of multiple surfaces that write into it.
2. **Feedback row is canonical, capture table is derived (Option
   B).** The feedback row carries the opt-in fact; a view, trigger,
   or ETL job projects capture rows for export purposes. The
   capture table is a cache; deleting a feedback row deletes the
   corresponding capture row on next projection.

**Came down to.** The lifecycle divergence between the feedback
event and the opt-in record. Under Option B, deleting a feedback
row for PII redaction necessarily deletes the opt-in record. Under
Option A, feedback purge and the opt-in record are independent
operations against independent rows — the consent record persists
for export use even if the surrounding feedback row is later purged
for unrelated reasons.

A second consequence: the standalone signup surface, when it ships,
has no feedback row to derive from. Under B that surface would have
to either invent a synthetic feedback row or fork its read path.
Under A the standalone surface and the feedback form are peer
writers into one capture table.

**Resolution.** Option A. The new opt-in capture table is
canonical; feedback emits a write-through. "Canonical" applies
within Neighborly's scope; persistent subscription state lives
downstream per Decision 7.

### 2. Opt-in capture table shape — append-only log keyed on a synthetic surrogate, with `event_slug` standing in for an org/tenant unit [Resolved → Option Log]

**What was decided.** The capture table is an append-only log of
consent events. Primary key is a synthetic surrogate (`id uuid` or
`bigserial`; final type is plan-level). `event_slug` and email are
non-null columns with a non-unique index supporting per-event
export queries — they are *not* a uniqueness constraint. Every
opt-in is its own row: the same attendee opting in via the
feedback form and again via the standalone widget produces two
rows, each capturing its own surface attribution and timestamp.
Export-time deduplication (one email per event) happens at export
render or at the downstream tool's import step, not at write time.

Every opt-in is event-scoped because every public surface that
produces one is event-scoped — the feedback form lives at
`/event/<slug>/feedback`, and the future standalone signup widget
will live somewhere under `/event/<slug>/*` for the same reason
every public surface in this product does. There is no slug-less
opt-in shape to model. `event_slug` stands in for the org/tenant
unit of consent for now; if a future epic introduces a real
multi-event-host concept, it adds an `org_id` column (or
equivalent) and the unit of consent migrates without the per-event
rows becoming wrong.

**Reframed from earlier scoping (twice).** This decision has
flipped twice during the scoping pass. Recording both pivots so
future readers see the framing trajectory:

- *First pivot:* the first draft chose a global-email-keyed shape
  (then-named D1) on the framing "one canonical yes-or-no per
  email." That framing relied on a slug-less surface that doesn't
  exist in this product and produced an attribution-loss bug
  reviewer Codex flagged (first-write-wins on a nullable
  `source_event_slug` would silently drop a second event's row).
  Maintainer caught the deeper framing error: the wrong axis was
  "global vs. per-event" when the right axis was "what's the unit
  of consent." Resolution flipped to a composite (event_slug,
  email) primary key.
- *Second pivot:* the composite-PK resolution carried `ON
  CONFLICT (event_slug, email) DO NOTHING` semantics — repeat
  opt-ins from the same email for the same event would silently
  no-op. Maintainer caught a structural contradiction with
  Decision 7's "append-only log of consent events" framing during
  a post-Proposed-gate read: those two cannot both be true. Log
  shape is the more honest fit under Decision 7's consent-capture-
  for-export role; repeat opt-ins are real signal worth preserving
  (source attribution per event, time progression, surface-
  conversion analysis), and export-time dedup is cheap. The right
  axis is "row-uniqueness vs append-only," and the doc had been
  silently importing row-uniqueness from earlier persistent-store
  drafts. Resolution flipped to surrogate-PK append-only log.

The promotion-gate "read end-to-end as a coherent whole" walk
should have caught the second contradiction before it was merged
into the doc's body; it didn't, and that's the kind of failure
mode worth recording so the next promotion gate audits more
adversarially.

**Why it mattered.** The shape choice locks how the standalone
signup feature, the feedback write-through, per-event organizer
exports, and any future organizer operations compose. Picking
row-uniqueness when the role is consent-capture-for-export silently
discards real signal (every repeat opt-in is information lost);
picking append-only log when the role is persistent-state-management
inflates storage with no consumer. The current Decision 7 framing
is the former; log shape matches it.

**Options considered.**

1. **Append-only log with synthetic PK (Option Log).** Surrogate
   primary key (`id uuid` or `bigserial`); `event_slug` and email
   are regular non-null columns with a non-unique index for export
   queries. Multiple rows per (event_slug, email) are expected and
   correct. Plain-INSERT semantics in the helper; no ON CONFLICT.
2. **Composite (event_slug, email) PK with row-uniqueness (Option
   C).** Single row per (event_slug, email) pair, ON CONFLICT DO
   NOTHING (or DO UPDATE) on repeat opt-ins. Rejected on
   Decision-7-contradiction grounds — see "Reframed from earlier
   scoping" above.
3. **Global table, single row per email (Option D).** Already
   rejected in the first pivot above. Decomposes into D1 (nullable
   source_event_slug, first-write-wins) and D2 (composite on
   email + source_surface); both rely on a slug-less surface that
   doesn't exist or split per-event consent across surfaces in the
   wrong direction.
4. **Email + history join table (Option E).** Two-table schema
   where the canonical row per email lives in one table and an
   opt-in-event log lives in another. Already rejected as
   over-engineered for v1; under the log-shape resolution it's
   even less useful (Option Log already IS the log half of E
   without the redundant canonical-row table).

**Came down to.** Whether row-uniqueness or append-only-log is
the right fit under Decision 7's consent-capture-for-export role.

- *Option Log (chosen).* Matches Decision 7's framing directly:
  every consent event is captured. Repeat opt-ins via different
  surfaces — or the same surface at different times — are
  preserved as distinct rows with distinct source attribution and
  timestamps. Export uses `select distinct email from … where
  event_slug = X` (or `select distinct on (email) … order by
  opted_in_at desc` if a most-recent-row-per-email shape is
  preferred); the downstream tool dedupes on import regardless.
  Helper logic is a plain INSERT — no conflict handling, no
  cogitation about whether ON CONFLICT updates `last_seen_at`
  or `source_surface`.
- *Option C.* Repeat-opt-in no-op silently discards real signal.
  If an attendee opts in via the feedback form and then later
  via the standalone widget, the second event tells us the
  widget converted them — composite-PK throws that away. Under
  the consent-capture-for-export role, that's the wrong default.
- *Option D1, D2, E.* Already rejected above; not revisited.

**Resolution.** Option Log. Load-bearing columns the implementing
plan will instantiate (final names and types deferred to plan
time):

- A surrogate primary key (`id uuid` or `bigserial`). Does not
  encode any business meaning; just makes individual rows
  addressable.
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
  index) is a plan-level call; what's settled is that the same
  address with different casing is treated as the same email for
  the same event at export-time deduplication.
- An `opted_in_at` timestamp recording the moment of this
  consent event. (Column-name finalization is plan-level;
  `subscribed_at` is the alternative — the implementing plan
  picks a name that aligns with the consent-capture framing
  rather than the persistent-subscription framing.)
- A `source_surface` column ('feedback_form' for the feedback
  write-through, 'standalone' for the standalone signup widget
  when it ships). Audit signal recording which surface produced
  this row; under log shape, useful for surface-conversion
  analysis as well as audit. Closed at the application layer;
  DB-level CHECK is plan-level.
- A non-unique index on `(event_slug, opted_in_at desc)`
  supporting per-event export queries. Plan-level whether
  additional indexes (e.g., on `email` for cross-event lookup)
  are added.

That is the entire column set. There is no `confirmation_status`
column, no `unsubscribed_at` column, no other lifecycle metadata,
and no uniqueness constraint over (event_slug, email). Per
Decision 7, Neighborly captures consent events for export;
persistent subscription state and its lifecycle (confirmation,
unsubscribe, delivery) live downstream in whatever tool the org
imports the export into.

The table is RLS-locked to service-role writes plus organizer/admin
read; the read predicate is `is_organizer_for_event` against the
event identified by `event_slug` or `is_root_admin` — the same
posture used by `feedback_submissions` at
[`supabase/migrations/20260506000000_add_feedback_tables.sql:89-98`](/supabase/migrations/20260506000000_add_feedback_tables.sql),
which applies cleanly because every row carries a non-null
`event_slug`. Writes from the public surfaces go through the
internal SECURITY DEFINER helper named in Decision 4.

### 3. Backfill — none; existing rows (if any) stay as audit-only on `feedback_submissions` [Resolved → Option G, simplified per maintainer direction]

**What was decided.** No backfill SQL in the implementing migration.
Pre-migration `feedback_submissions` rows where `newsletter_opt_in =
true` keep that flag set but do not propagate to the new capture
log. Fresh post-migration submissions write both the feedback row's
audit flag (per Decision 5) and a capture-log row (via the helper
from Decision 4); the new capture log starts populated only by the
helper, never by direct backfill SQL.

**Maintainer-attested assumption recorded inline.** Earlier drafts
of this decision picked Option F (migration-time backfill) on the
rationale that forward-only would lose real consent records. The
maintainer attests at scoping time that there's no production data
worth preserving — the feedback table has not yet served a real
event, and any rows present are test traffic. **This assumption is
not verifiable from in-repo state** (the migration file proves the
table exists, not what's in it); production row count is what would
falsify it. The implementing pass owns the reality check before
locking in no-backfill SQL (see Reality-check inputs). Under the
assumption as stated, the simplest path wins: skip the backfill SQL
entirely. Truncating the table first is offered as an alternative
the implementing pass may pick if a clean-slate state is preferred
over a leave-existing-rows state, but neither is materially
different for the v1 outcome.

**Why this is consistent with Decision 5.** Decision 5 frames
`newsletter_opt_in` on `feedback_submissions` as a snapshot of
intent at submission moment, durable on the feedback row itself.
A pre-migration row with `newsletter_opt_in = true` and no
corresponding capture-log row is a valid state under that framing
— it's a snapshot of "they opted in at this submission moment,
before the capture log existed." No drift correction needed; the
audit semantic absorbs the unmigrated rows cleanly.

**Options considered.**

1. **Migration-time backfill (Option F).** Insert capture-log rows
   for every `newsletter_opt_in = true` feedback row at migration
   apply. Initially picked on the (then-correct) rationale that
   real consent records shouldn't be lost. Becomes over-engineering
   once the maintainer confirms there are no such records to
   preserve.
2. **Forward-only, no backfill SQL (Option G).** New capture-log
   rows only land from opt-ins after the migration. Pre-existing
   feedback rows keep their `newsletter_opt_in` boolean as
   audit-only signals consistent with Decision 5.
3. **Truncate `feedback_submissions` in the migration (Option G',
   variant).** Same as G but adds an explicit `truncate
   public.feedback_submissions` step before creating the capture
   log. Yields a guaranteed-clean starting state at the cost of a
   destructive verb in the migration.
4. **Backfill plus distinct backfill marker (Option H).** Same as
   F but with a sentinel value flagging backfilled rows. Rejected
   under any of the above framings — premature flexibility.

**Resolution.** Option G. The implementing migration creates the
new capture log, the internal helper, and the `submit_feedback`
body update without any data-movement SQL. The
implementing pass may instead pick Option G' (add a `truncate`
step) if it judges a clean-slate start to be operationally
clearer; both options satisfy the scoping resolution. The
implementing plan owns whichever SQL it picks; this doc does not
draft it.

### 4. Write path from feedback — synchronous write through an internal SECURITY DEFINER helper, called from surface-specific public RPCs [Resolved → Option L, internal-helper variant]

**What was decided.** The feedback RPC's existing INSERT is wrapped
in a single transaction with a *conditional* call to a shared
opt-in-capture helper — the helper is invoked only when the caller
passed `p_newsletter_opt_in = true` (i.e., the attendee actually
checked the newsletter box). Unchecked submissions still write the
feedback row but produce no capture row. The same helper is the
write entry point for the eventual standalone signup RPC, where
the conditional is trivially true (the standalone surface only
exists to capture an opt-in). The helper performs a plain INSERT
into the append-only capture log defined in Decision 2 — no ON
CONFLICT clause, no conflict resolution. Multiple opt-ins from the
same email for the same event (whether via the same surface
twice or via different surfaces) produce multiple rows; each is a
real consent event captured for the export downstream. **The
helper is internal — not granted to anon or authenticated.**
Public callers reach the helper only through surface-specific
SECURITY DEFINER RPCs (`submit_feedback` for the feedback flow; a
future `submit_newsletter_signup` for the standalone signup flow),
each of which hardcodes its own `source_surface` value and
constrains its own `event_slug` shape before calling the helper.

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
   p_source_surface)` SECURITY DEFINER helper. Decision 2's
   append-only log shape makes `p_event_slug` and `p_email`
   required-non-null inputs and `p_source_surface` the audit
   attribution; the helper INSERTs a new log row on every call.
   Decomposes into:
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
  the standalone surface ships, the rules (email normalization,
  source-attribution literal, INSERT shape) live in two places.
  The recurring trap of two surfaces silently disagreeing about
  what opt-in capture means is exactly what the
  "no-business-rule-duplication" guardrail in
  [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  pushes against.
- *Option K1.* Better than I but worse than L: the two helpers
  exist to share rules, but the actual sharing is by convention
  not by callsite. Same drift risk, dressed up.
- *Option L-public.* The category-level "shared helper" answer,
  rejected on abuse grounds. The helper signature
  `(p_event_slug, p_email, p_source_surface)` makes two of those
  three parameters attacker-controlled when invoked directly: a
  hostile anon caller could pick an `event_slug` for any feedback-
  registered event they want to claim consent against, and stamp
  `p_source_surface = 'feedback_form'` to forge "they opted in
  via the feedback form" without ever going through
  `submit_feedback` (or the inverse: stamp `'standalone'` to forge
  a signup the standalone surface never produced). Under the
  append-only log shape (Decision 2) the abuse surface is
  arguably worse, since each forged call produces a real row that
  shows up in exports — there's no idempotency to absorb the
  attack. The `submit_feedback` RPC at
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
  widget renders on event pages). The helper INSERTs a new
  capture row on every invocation — duplicate opt-ins (same
  attendee opts in twice for the same event via different
  surfaces, or via the same surface at different times) produce
  multiple rows, one per consent event, per Decision 2's
  append-only log shape. Failure of the capture INSERT rolls
  back the feedback INSERT — a consistency guarantee that
  matches user expectation: "submit feedback with newsletter
  checked" should not produce a feedback row claiming opt-in
  alongside a missing capture row. The internal-only grant
  posture is enforced by `revoke execute on function … from
  public, anon, authenticated`; no matching `grant` is issued
  for those roles.
- *Option J.* The async path exposes a window where the feedback
  admin surface says "X opted in" while the capture log doesn't
  yet have a row for X. For v1 with manual export to a downstream
  tool, that window is operationally bad — the organizer reading
  either surface during the gap sees an inconsistent state. The
  complexity of background-job retry semantics is paid for no
  v1 benefit. The async shape is a reasonable v2+ if capture
  writes ever need to fan out to external systems (e.g.,
  Mailchimp), but at that point the trigger is the external
  fan-out, not the cross-table consistency, and the design space
  reopens.

**Resolution.** Option L-internal. The implementing plan defines
the helper's full signature and INSERT body; this doc names the
parameter shape (`p_event_slug`, `p_email`, `p_source_surface` —
two non-null inputs gating event and identity, plus the audit-only
surface attribution), the public API contract (surface-specific
RPCs are the boundary; the helper is internal-only), the grant
posture (`revoke execute … from public, anon, authenticated`; no
`grant execute … to anon, authenticated` is issued), and the
write semantics (plain INSERT, no ON CONFLICT clause — repeat
opt-ins produce additional log rows per Decision 2). The
`submit_feedback` body is extended to call the helper **only when
the caller passed `p_newsletter_opt_in = true`** — unchecked-box
submissions still INSERT the feedback row but do not write a
capture row, since no opt-in occurred. When the helper is called,
the arguments are `p_event_slug = p_event_slug` (passing through
the already-FK-gated value the existing INSERT uses), `p_email =
p_email` (passing through the same email value the feedback row
INSERT writes — the existing CHECK constraint
`feedback_submissions_newsletter_opt_in_requires_email` at
[`supabase/migrations/20260506000000_add_feedback_tables.sql:62-66`](/supabase/migrations/20260506000000_add_feedback_tables.sql)
guarantees this is non-null whenever
`p_newsletter_opt_in = true`), and `p_source_surface =
'feedback_form'` (literal, not from a parameter). The standalone
signup feature, when scoped, ships its own public SECURITY
DEFINER RPC that calls the helper with `p_source_surface =
'standalone'` (literal); its `p_event_slug` shape is settled in
that scoping pass. The set of permissible `source_surface` values
is enforced at the public-RPC boundary (each RPC hardcodes one
literal); a DB-level CHECK on `source_surface` is a
defense-in-depth option the implementing plan may add but is not
the primary gate.

### 5. Feedback-row audit flag — keep `newsletter_opt_in` as a denormalized audit signal [Resolved → Option N]

**What was decided.** The existing
`feedback_submissions.newsletter_opt_in` boolean stays. Its semantics
are "the attendee asserted opt-in at the moment of this
submission" — a snapshot of intent at submission time, durable on
the feedback row regardless of what later happens to the
corresponding capture row (PII purge, etc.). The CHECK constraint
`feedback_submissions_newsletter_opt_in_requires_email` at
[`supabase/migrations/20260506000000_add_feedback_tables.sql:62-66`](/supabase/migrations/20260506000000_add_feedback_tables.sql)
remains in force — you cannot audit-flag an opt-in against a row
with no email. No FK from feedback row to capture row.

**Why it mattered.** Without an audit signal, a future PII
redaction of a capture row would erase the historical fact "this
attendee opted in via the feedback surface at this submission
moment." With an FK, the foreign-key side of that deletion has to
either cascade or restrict; both have sharp edges (cascade hides
the audit, restrict blocks legitimate deletes).

**Options considered.**

1. **Drop `newsletter_opt_in` from `feedback_submissions` entirely
   (Option M).** The opt-in capture table is the only record of
   opt-in. Feedback rows say nothing about whether the attendee
   opted in.
2. **Keep `newsletter_opt_in` as a boolean denormalized audit
   (Option N).** The column persists; semantics are "did this
   attendee assert opt-in at this submission moment."
3. **Replace the boolean with an FK to the capture row (Option
   O).** Strongest referential integrity; the feedback row points
   at the capture row it caused.

**Came down to.** What happens at PII purge time and whether the
feedback record can stand on its own as an audit signal.

- *Option M.* Loses the moment-in-time audit. If the organizer
  reads feedback later and sees a row with `email = null` and
  `email_declined = true`, that is unambiguous. If the organizer
  reads a row with `email` present and wants to know whether the
  attendee opted in at that moment, M offers no answer — the
  capture row may have since been purged, and the feedback record
  is silent on what was true at submission time.
- *Option N.* The denormalized boolean is a snapshot of the
  consent assertion at submission time, durable on the feedback
  row itself. PII purge of a feedback row removes the snapshot
  and leaves the capture row intact (the export downstream is
  unaffected); PII purge of a capture row removes the canonical
  consent record but leaves the feedback row's audit signal
  showing "they opted in at this moment." The CHECK constraint at
  [`supabase/migrations/20260506000000_add_feedback_tables.sql:62-66`](/supabase/migrations/20260506000000_add_feedback_tables.sql)
  carries forward unchanged because the invariant ("can't audit
  opt-in without an email") still holds.
- *Option O.* The FK creates a write-order coupling: capture row
  must exist before feedback row, which is fine under the
  synchronous write-through (Decision 4) but adds rigidity. PII
  redaction of a capture row either cascades (audit lost, same
  as M) or restricts (cannot redact while feedback rows
  reference). Both are operationally worse than N. The
  referential-integrity benefit is paid for no use case beyond
  what N already covers.

**Resolution.** Option N. The implementing migration does not
modify `newsletter_opt_in`'s shape on `feedback_submissions`. A
header comment on the table or column documents the snapshot
semantics — exact wording is plan-level.

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
accepts because `p_event_slug` is required-non-null per Decision
2's column set). Per Decision 4's resolution, the helper is
internal — anon does not call it directly. The helper signature,
the source-surface literal set ('feedback_form', 'standalone'),
and the capture-table append-only log shape (Decision 2) are
settled here so any later surface that ships against this data
inherits a contract rather than co-designing with this work.

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
  always receives a non-null `p_event_slug` (required by
  Decision 2's column set); what's deferred is how the
  surrounding public RPC obtains it.

The data-shape and write-contract decisions in this doc bind
regardless of where the plugin scoping lands those decisions,
and regardless of whether the implementing PR for *this* scoping
ships in `public.*` today or in a plugin namespace later (see
Plan structure handoff).

### 7. Compliance posture — Neighborly is a consent-capture surface; persistent list state lives downstream [Resolved]

**What was decided.** Neighborly's role in the newsletter pipeline
is **consent capture for export**, not persistent subscriber-list
maintenance. Single opt-in semantics: an attendee checking the box
and submitting is recorded as having opted in at that moment, and
the row is exported (CSV or equivalent) for the organizer to
import into whatever mailing-list tool they actually run their
list out of (Mailchimp is the named v1 case; the architecture
doesn't anticipate Neighborly being the persistent maintainer of
any org's list, since the org's real list is assumed to be larger
than just events run on Neighborly). The downstream tool owns
confirmation flows, unsubscribe state, send/delivery, and
list-membership truth from the moment of import forward.

This reframes the schema substantially:

- **No `confirmation_status` column.** Earlier drafts kept this as
  forward-compatibility for a v2 double-opt-in. The reframing
  makes that v2 not coming — confirmation lives in Mailchimp's
  import flow, not in our schema. Storing a column we will never
  populate beyond a default is overengineering against an
  imagined future.
- **No `unsubscribed_at` column.** Same logic. Once the export
  reaches the downstream tool, that tool's unsubscribe link is
  the user-facing path; its database is the source of truth for
  "is this email currently subscribed." Our row is a record of
  the consent moment, not of current subscription state. If
  someone in Mailchimp clicks unsubscribe, our row stays as it
  was — and that's correct, because our row never claimed to
  represent current state.
- **Append-only opt-in capture.** The table is best understood
  as a log of consent events, not a list of current subscribers.
  Re-exports are full snapshots of opt-ins-since-last-export (or
  full snapshots full-stop, with the downstream tool deduping on
  import). Mailchimp respects the unsubscribe state it already
  has during import; Neighborly does not need to know.

**Why it mattered.** The earlier "schema forward-compatible for
double opt-in" framing imported a mental model where Neighborly
was the persistent subscription manager and Mailchimp (or
whatever) was an output destination. The reverse is true:
Mailchimp (or whatever) is the persistent manager and Neighborly
is one input source among many for the org's list. Schema
designed for the wrong role carries persistent overhead — every
future plan reads the empty `confirmation_status` and
`unsubscribed_at` columns and asks "what populates these?"

**Came down to.** The epic-level Risk Register entry "Newsletter
consent is load-bearing legally" at
[`docs/plans/epics/madrona-feedback/epic.md:474-481`](/docs/plans/epics/madrona-feedback/epic.md)
locked single-opt-in semantics with downstream-tool unsubscribe
respect — and the epic's "Newsletter delivery pipeline" Resolved
Decision at
[`docs/plans/epics/madrona-feedback/epic.md:514-516`](/docs/plans/epics/madrona-feedback/epic.md)
("manual export by the organizer post-event. No automated sync
to a newsletter tool from this epic") locked the export-not-sync
shape. Earlier drafts read that constraint as "v1 doesn't sync,
v2 might"; the maintainer's clarification is "Neighborly is not
in the persistent-list business at all," which makes the v2
implication wrong and motivates the column trim.

**Resolution.** Single opt-in capture only. The schema models the
consent moment (event, email, when, source surface) and nothing
else. No confirmation state, no unsubscribe state, no delivery
metadata. Export is the downstream contract; what the org does
with the export is outside Neighborly's scope.

## Plan structure handoff

This scoping doc resolves all seven open questions named in the
maintainer's framing; no Open Decisions remain for plan-drafting
to resolve. Whether the next step is a phase plan doc or direct
implementation is a maintainer decision.

If the next step is a plan doc, the natural shape is one cross-
cutting plan at the same top-level location (alongside this
scoping doc), since the implementing PR touches the
madrona-feedback epic's table without belonging to that epic's
milestone structure. The plan would own: the new capture-log
migration (append-only shape per Decision 2), the internal
`subscribe_email` helper RPC (SECURITY DEFINER, EXECUTE revoked
from public/anon/authenticated per Decision 4), the
`submit_feedback` RPC body update to conditionally call the
helper with hardcoded `p_source_surface = 'feedback_form'` when
`p_newsletter_opt_in = true`, the regenerated
`shared/db/types.ts`, and any clarifying comments on
`feedback_submissions.newsletter_opt_in`'s snapshot semantics.
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

- **Single PR.** The migration (new capture log + internal helper
  RPC), the `submit_feedback` body update to call the helper, the
  `shared/db/types.ts` regeneration, and any doc updates fit one
  cohesive review chunk well below the AGENTS.md ">5 distinct
  subsystems" or ">300 LOC of substantive logic" thresholds.
  Subsystems touched: SQL migration, RPC body, generated types,
  doc surface — four, not five.
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
- **`feedback_submissions` production row count (no-backfill
  assumption falsifier).** Decision 3 rests on a maintainer-attested
  assumption that the table has not yet served a real event. That
  claim is not verifiable from in-repo state. The implementing pass
  reality-checks before locking in no-backfill SQL: query the
  production database for `select count(*), max(submitted_at) from
  public.feedback_submissions` (or equivalent), and confirm the row
  count is consistent with test traffic and that no rows post-date
  any event-served-yet milestone. If the count is unexpectedly
  high or rows trace to a real event, the no-backfill resolution
  must be revisited and either Option F (backfill) or Option G'
  (truncate) becomes load-bearing again — do not silently ship
  no-backfill SQL against a populated table.
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
  capture log's `event_slug` column, on the basis that every v1
  surface that produces a capture row is event-scoped against a
  feedback-registered event. The plan confirms the registry's
  lifecycle (when slugs get added / removed / renamed)
  accommodates a second downstream FK without introducing weird
  cross-table coupling at slug-rename time (the existing
  `on delete restrict` posture at line 53 already blocks slug
  deletion while feedback rows reference; the new FK extends that
  block to capture-log rows, which is the intended behavior).
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
  `source_surface` / `event_slug` attribution. Reality-
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
- Unsubscribe semantics in Neighborly's schema. Per Decision 7,
  unsubscribe is owned by the org's downstream tool (Mailchimp or
  equivalent); Neighborly's table does not model it.
- Any organizer-facing read surface for the new opt-in capture
  table beyond what madrona-feedback M2 already sketches at
  [`docs/plans/epics/madrona-feedback/m2-organizer-readable-surface.md`](/docs/plans/epics/madrona-feedback/m2-organizer-readable-surface.md)
  (which is `Deferred` and non-prescriptive per its Status
  block). When M2 reopens, its scoping reads against the new
  table shape rather than the current `newsletter_opt_in`
  column. Notably, the export-to-CSV operation Decision 7 names
  as the v1 downstream contract is part of this deferred surface
  — its shape is M2's call.
- Email-sending pipelines, double-opt-in confirmation flows, and
  any automated fan-out to Mailchimp or other external systems.
  Per Decision 7, Neighborly is a consent-capture surface, not a
  delivery system; these features are not anticipated as future
  Neighborly work either.
