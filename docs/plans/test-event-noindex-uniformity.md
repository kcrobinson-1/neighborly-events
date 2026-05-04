# Test-Event Noindex Uniformity — Decision Doc

## Status

Open. Awaiting product decision.

The question crystallized in PR #170 (M3 phase 3.3.2's
implementing PR) when a Codex review caught a trailing-slash gap
in the apps/web `X-Robots-Tag` rules. Fixing the gap forced a
6-entry shape (bare + `/:path*` per bypass surface). That fix
landed; the broader question — *"are we writing the right number
of entries at all, given what we mean by `internal-partner
audience`?"* — is what this doc resolves.

This is a decision-bound item (no dev work until the product
choice lands). Tracked in the [post-MVP backlog](/docs/backlog.md).

## Context

After M3 closed, the apps/web + apps/site noindex coverage on the
two test-event slugs (`harvest-block-party`, `riverside-jam`) is:

| Surface | Origin | Indexable? |
| --- | --- | --- |
| `/event/harvest-block-party` (event landing) | apps/site | **noindex** (`generateMetadata` `robots`) |
| `/event/harvest-block-party/admin` (bypass) | apps/web | **noindex** (M3 `X-Robots-Tag`) |
| `/event/harvest-block-party/game/redeem` (bypass) | apps/web | **noindex** (M3 `X-Robots-Tag`) |
| `/event/harvest-block-party/game/redemptions` (bypass) | apps/web | **noindex** (M3 `X-Robots-Tag`) |
| `/event/harvest-block-party/game` (gameplay) | apps/web | **indexable** |

The gameplay route is the only crack. It was not touched in M3 —
the milestone-doc Goal section says "gameplay route is unchanged"
— and that framing reads as preservation-of-prior-state language,
not active product design. Before M3, the apps/web event surfaces
had no noindex story at all, so the gameplay-route's indexability
was an artifact of *no apps/web noindex anywhere*, not a
deliberate "we want gameplay discoverable" choice.

After M3 closes, we sit on a decision point: keep gameplay as the
lone outlier in an otherwise uniform "test events are invisible to
public search" story, or close the gap.

## The Question

**Should `/event/:slug/game` for test-event slugs (`harvest-block-party`,
`riverside-jam`) be `noindex`'d alongside the rest of the test-event
surface, or stay publicly indexable?**

The non-test slug case (`madrona-launch-day` and any future real
event) is unambiguous and out of scope for this doc — real events
need to stay discoverable so their attendee gameplay surfaces
appear in search. Only the test-slug gameplay routes are in
question.

## Options

Each option below walks the rendered consequence: what a real user
or crawler experiences, what apps/web's `vercel.json` ends up
looking like, and what the Vitest enforcement test asserts.

### Option A — Keep gameplay indexable (current state, post-PR-#170)

`apps/web/vercel.json` keeps the 6-entry list, one paired bare +
`/:path*` per bypass surface (`/admin`, `/game/redeem`,
`/game/redemptions`). The bare gameplay route `/event/:slug/game`
and its sub-paths get no `X-Robots-Tag`. Crawlers can index test-
event gameplay; the Vitest test asserts the list shape.

**What a user / crawler experiences.**

- A search engine crawling `/event/harvest-block-party/game` reads
  the apps/web SPA, indexes the gameplay shell + the in-app
  question content, and may surface the URL for queries that
  match.
- Someone Googling "harvest block party" might find Kyle's test-
  event quiz alongside (or above) any real-world neighborhood
  events with similar names.
- Internal partners hitting demo URLs are unaffected — their
  experience is the same regardless of `noindex` state.

**Why product might pick A.**

- **Validation discoverability.** If the test events are intended
  as demo *targets* — surfaces a sponsor or partner is meant to
  Google to "find" the demo without us emailing them a link —
  indexing is the mechanism that makes find-via-search work.
- **Future flexibility.** If demo-mode generalizes beyond the
  test-event allowlist (one of the post-epic backlog items), the
  generalized variant may want gameplay-route discoverability so
  partner-onboarding scenarios can lean on search.
- **No surprise downgrades.** Anything currently being
  shared/linked to the gameplay route stays in search results
  exactly where it is.

**Why engineering might pick A.**

- **Surface-granular control.** The 6-entry list lets you change
  one surface's headers without touching others (e.g., adding
  `nosnippet` to admin only would be a one-line change).
- **Explicit gameplay exclusion.** The fact that no entry mentions
  `/game` makes it impossible to accidentally noindex the
  gameplay route. The negative-match Vitest assertion is
  belt-and-suspenders on top.
- **Aligns with apps/site precedent.** apps/site noindex is also
  surface-scoped (`/event/:slug` only, not `/event/:slug/*`).

**Trade-offs / risks.**

- **Search-confusion risk.** Both test-event names
  (`harvest-block-party`, `riverside-jam`) are generic enough
  that real-world neighborhood events may collide. Someone
  searching for an unrelated real event by that name could land
  on the test quiz, start playing, and either hit operational
  dead-ends (no real attendee flow, no real verification) or
  complete a placeholder game with placeholder sponsors.
- **Internal-partner-audience invariant has a crack.** The epic's
  framing — "test events are internal-partner-shaped" — holds for
  every surface except gameplay. Future readers of the
  architecture doc / epic / milestone notes have to reconcile the
  inconsistency every time.
- **Placeholder-sponsor reputation surface.** Test-event content
  includes sponsor names. They're fictional, but they're real
  strings in the indexable HTML. If a real local business has a
  similar name, search-engine crawling could associate that
  business with a placeholder game they didn't sign onto. Low
  impact in practice (test sponsors are generic enough that
  collision is unlikely), but it's a vector that disappears
  entirely under Option B.
- **Maintenance cost on new bypass surfaces.** Adding a new
  bypass surface in M4+ requires three edits: `vercel.json` (new
  pair), Vitest test (new entries in `EXPECTED_SUFFIXES`), and the
  plan doc Contracts section. Bounded, but real.

### Option B — Uniformly noindex the entire test-event apps/web surface

`apps/web/vercel.json` collapses to **one entry**:

```json
{
  "source": "/event/:slug(harvest-block-party|riverside-jam)/:path*",
  "headers": [
    { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
  ]
}
```

That covers admin/, admin/x, game, game/, game/redeem, game/redemptions,
and any future bypass surface added under a test slug — all with
`X-Robots-Tag: noindex, nofollow`. The Vitest test simplifies to
inspect one entry; the slug-list byte-equivalence guard still
works against the single regex constraint.

**What a user / crawler experiences.**

- A search engine indexing apps/web sees no test-event surfaces.
  Test events are invisible to public search.
- Internal partners hitting demo URLs are unaffected.
- Real events (`madrona-launch-day` and any future non-test slug)
  remain fully indexable — the regex constraint excludes them.

**Why product might pick B.**

- **Internal-partner-audience invariant holds end-to-end.** Test
  events are uniformly invisible to public search. The epic's
  framing matches the rendered surface.
- **Removes search-confusion risk.** Generic event names can no
  longer trap users searching for unrelated real events.
- **Removes placeholder-sponsor surface.** Fictional sponsors in
  test content stop existing as indexable strings.
- **Cleaner story for partner-onboarding follow-ups.** The
  post-epic "production-friendly demo-mode for partner-onboarding
  scenarios" backlog item starts from "test events are uniformly
  internal-only" rather than "test events are mostly internal-only
  except for one route nobody can articulate why."

**Why engineering might pick B.**

- **One entry instead of six.** The slug regex constraint, the
  header value, and the surface enumeration collapse into a
  single configuration shape. The Vitest test becomes proportionally
  smaller.
- **Future-proof.** Adding a new bypass surface in M4+ requires
  zero `vercel.json` change — the catchall covers it
  automatically. The same generalization applies if M3 itself
  ever adds a new path under a test slug (e.g., a future read-
  only audit-log surface).
- **Mirrors the rewrites' actual semantics.** apps/web's existing
  rewrites for `/event/:slug/game/:path*`, `/event/:slug/admin`,
  etc., already serve everything under a test slug from the same
  apps/web SPA. The headers-config catchall mirrors that runtime
  shape one-to-one.
- **Simpler drift surface.** One regex constraint to keep in sync
  with `TEST_EVENT_SLUGS`. The Vitest byte-equivalence check
  still catches slug-list drift; it just has less to inspect.

**Trade-offs / risks.**

- **Loss of surface-granular control.** If a future need wants to
  emit different headers per bypass surface (e.g., `nosnippet` on
  admin only), the catchall has to be unwound. Probability is
  low — `noindex, nofollow` is the policy across all bypass
  surfaces today and the apps/site precedent uses the same
  uniform value.
- **Potentially stale links downgrade.** Anything currently
  shared/linked to test-event gameplay disappears from search
  results. **In practice, nothing is currently linked there
  externally** — apps/site role-door cards link internally, the
  apps/site landing is already noindex, and there is no public
  marketing surface pointing at `/event/harvest-block-party/game`.
- **Silent extension to surfaces we haven't authored yet.** Any
  future path under a test slug would inherit `noindex` without
  the author thinking about it. **In context this is a feature**
  (uniform internal-partner-audience invariant), not a bug, but
  it does shift the default from "explicit opt-in to noindex"
  to "explicit opt-in to indexability."

### Option C — Per-surface explicit list with gameplay added

Keep the 6-entry shape and add a 7th + 8th entry pair for
`/event/:slug(...)/game` + `/event/:slug(...)/game/:path*`. Eight
total `headers` entries; gameplay-route covered explicitly rather
than via catchall.

**Why this isn't really a separate option.** It's Option B's
behavior with Option A's mechanism. The product effect is identical
to Option B (uniform noindex). The engineering cost is strictly
worse than B (8 entries instead of 1). It's only worth listing as
a refusal: if we choose to noindex gameplay, choose B's mechanism
unless there's an explicit reason for surface-granular control we
haven't articulated.

## Recommendation

**Pick Option B.** Confidence: **medium-high.**

The product story for Option A — "we want test-event gameplay
discoverable in search" — does not appear anywhere in the
demo-expansion epic, the milestone docs, the M3 phase plans, or
the docs corpus generally. The epic's `internal-partner audience`
invariant points the other way; the apps/site landing-page
noindex points the other way; the M3 bypass-surface noindex points
the other way. Option A is the surface that's currently rendered
not because anyone designed it, but because apps/web had no
noindex story at all before M3 and the M3 plan opted to "leave
gameplay unchanged" rather than re-scope at M3-closing time.

Option B aligns the rendered surface with the framing the docs
already use. It also collapses the `vercel.json` config to a shape
that matches what `internal-partner audience` actually means
("everything under a test slug is invisible to public search"),
and the Vitest test gets simpler in proportion.

**Why not higher confidence.** I have not interviewed anyone about
whether there's a partner-discovery scenario (someone Googles
their way to the demo) that I'd be foreclosing. If that scenario
exists and is load-bearing for sales / partner-onboarding, it
flips the recommendation. The PR opening this doc is the place to
surface that input.

**Why not lower confidence.** Every articulated risk under Option
B is either bounded (loss of surface-granular control,
probability low) or dominated (link-downgrade has no observed
external links to downgrade). The risks under Option A are real
(search confusion, sponsor reputation surface, invariant crack)
even if individually small.

## What The Decision Comes Down To

This is a one-question decision. Everything else falls out of it:

> **Does any product story require test-event gameplay routes to
> be search-discoverable?**

- **Yes** → Option A. Keep the 6-entry list. Document the
  partner-discovery scenario in the epic's framing so the
  invariant crack reads as deliberate. Add the rationale to the
  epic Risk Register so future readers understand the trade-off.
- **No** → Option B. Collapse to one catchall entry. Delete the
  per-surface enumeration. Update the Vitest test. Update the
  milestone-doc Goal section ("gameplay route is unchanged" →
  "gameplay route inherits the test-event-uniform noindex").
  Update the architecture doc apps/web app-section paragraph to
  name the catchall instead of the per-surface list.

I can think of no third answer. If the product owner can name a
specific partner-onboarding or sponsor-acquisition scenario where
test-event gameplay being Googleable is the load-bearing
mechanism, that's Option A. If they can't, that's Option B.

## Implementation Note

Whichever option lands, the implementing PR is small:

- **Option A → no-op.** Current state. No PR needed; this doc
  resolves with a recorded rationale.
- **Option B → ~50-line PR.** `vercel.json` headers array
  collapses from 6 entries to 1; Vitest test rewrites for the
  single-entry shape; milestone-doc Goal sentence updates; epic
  M3 paragraph and architecture-doc apps/web app-section
  paragraph extend by one clause. The PR itself is mechanical;
  the decision walked here is the load-bearing input.

Either way, this doc closes (Status flips `Open` → `Resolved` with
the chosen option recorded) when the decision lands.

## Related Docs

- [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  M3 milestone doc; Goal section is where the "gameplay route is
  unchanged" framing lives.
- [`docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md) —
  Phase 3.3.2 plan; Contracts "apps/web noindex emit" section
  documents the 6-entry list and its path-to-regexp constraints.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — current
  6-entry headers config under deliberation.
- [`tests/web/demo-mode-bypass-noindex.test.ts`](/tests/web/demo-mode-bypass-noindex.test.ts) —
  Vitest enforcement test that would shrink under Option B.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx) —
  apps/site `generateMetadata` precedent that already noindexes
  test-event landings.
- [`docs/plans/epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  Epic-level framing ("internal-partner audience" invariant)
  cited as Option B's load-bearing rationale.
- [`docs/backlog.md`](/docs/backlog.md) — Tier 4 entry pointing
  here.
