# Organization Isolation Roadmap

Status: Tracking — no work scheduled. Last updated 2026-05-08.

This file captures the long-term goal of letting an organization (initially
the Madrona Neighborhood Association, eventually other neighborhood
associations or similar groups) operate the music event experience under
their own domain, with full control over the data, members, and consent
surfaced under that route. It records the architectural commitments made
during scoping so they do not need to be re-derived, names the triggers
that should cause work to actually begin, and lists workstreams in rough
order without committing to dates.

This is not a per-phase implementation contract. Per-phase contracts go
in `docs/plans/` when the corresponding workstream begins.

## North Star

Madrona — and eventually any organization that runs a similar event —
operates a music event experience under their own domain. They control
the submitted data, the people authorized to manage their events, and
the consent given by participants. The maintainer's involvement could
end without breaking the experience.

The framing word is **isolation**, in four concrete senses:

- **Data isolation** — submissions, feedback, and mailing-list opt-ins
  are visible to that organization's members only.
- **Operational isolation** — that organization's authorized members
  manage their own events without the maintainer in the loop.
- **Identity isolation** — consent copy names the organization as the
  data controller, presented under the organization's domain and brand.
- **Continuity isolation** — the experience survives the original
  maintainer's absence, including domain control, payment ownership,
  and data export.

## Current State

- The deployment is single-tenant; no organization, tenant, or group
  entity exists in the schema.
- Roles are event-scoped only, via `event_role_assignments` (enum:
  agent, organizer).
- A separate email-keyed allowlist (`admin_users`) covers platform-level
  capabilities such as quiz authoring; this is a different axis from
  per-event tenant authority.
- No per-organization custom-domain capability exists in the schema.
- Authorization is enforced at the database via RLS policies that call
  security-definer SQL functions; app-side helpers and edge functions
  mirror those checks by calling the same RPCs.

## Architectural Commitments

Decisions made during scoping that should not need to be re-litigated
absent new information.

- **Subdomain via CNAME → Vercel, not a WordPress export.** A WordPress
  export either ships a static snapshot that loses dynamic features or
  ships an embed that still calls the same backend, gaining nothing.
  The CNAME path keeps a single deploy target and full feature parity.
- **Organization is a first-class entity that owns events.** Once
  introduced, events get an `organization_id` foreign key. Existing
  data backfills to a single organization for Madrona.
- **Three tenant roles with role inheritance: Owner, Organizer,
  Agent.** Owner extends Organizer; Organizer extends Agent. Owner is
  meaningfully gated only by the capability to remove or demote other
  organization members in v1; other capabilities are equal between
  Owner and Organizer until a customer needs the distinction.
- **Platform admin stays on a separate axis from the tenant role
  tree.** The existing `admin_users` allowlist does not become the top
  of the Owner/Organizer/Agent hierarchy. Conflating support access
  with tenant authority produces wrong access semantics.
- **No policy framework.** Casbin, Oso, CASL, and similar are not
  introduced. RLS remains the trust boundary; app-side checks are a
  UX mirror. Drift between RLS and the app-side mirror is intrinsic to
  having two enforcement layers and is treated as a UX concern, not a
  security one.
- **Owner is not pre-built at event scope.** Adding Owner to
  `event_role_assignments` before the organization refactor would be
  throwaway work, since Owner conceptually lives at organization
  scope. Owner emerges naturally as part of the organization refactor.
- **Agent is event-scoped and may not require organization
  membership.** Day-of helpers can be granted narrow, single-event
  access without joining an organization.

## Triggers To Begin Work

The roadmap is in a holding pattern. Work begins when one of the
following fires:

- A second association or similar group requests the same custom-domain
  experience.
- A feature lands or is queued that requires organization-scoped data —
  for example, cross-event reporting or organization-level history.
- Madrona's continuity becomes urgent — for example, the original
  maintainer stepping back, or the association asking to take over
  operations.

Until a trigger fires, no auth-or-tenant code changes for the sake of
this roadmap. Madrona runs on the existing organizer/agent system; one
organizer (the maintainer) plus event-day agents covers the operational
need.

## Workstreams

In approximate sequence. Each workstream is one cohesive piece of work,
not a list of PRs. Per-phase contracts and PR splits get written when
the workstream begins.

### Organization entity refactor

Status: not started

Adds `organizations` and `organization_members(user_id, org_id, role)`
with role inheritance. Adds `organization_id` to events. Replaces
`is_organizer_for_event(event_id)` with a derived check that asks
whether the user is an organization member with sufficient role for the
organization that owns the event. Backfills existing data to a single
organization. Collapses scattered app-side auth helpers into one
unified helper. Leaves `admin_users` alone as the platform-admin axis.

Open questions during this workstream:

- Should `admin_users` be renamed `platform_admins` to surface the
  axis distinction?
- Where does the organizer-and-agent invite flow live — inside this
  workstream or in organizer self-service?

### Custom-domain support

Status: not started

Adds an `organization.custom_domain` field and host-aware routing so
that a domain such as `music.madrona.us` serves the route assigned to
the corresponding organization. For v1, DNS and Vercel-side domain
registration are manual on both sides. Vercel-API-driven provisioning
is deferred.

Open questions during this workstream:

- Does the first custom-domain launch precede or follow the
  organization refactor? Almost certainly follows, but worth naming so
  the launch is not pulled forward without the data isolation it
  depends on.

### Organizer self-service

Status: not started

The minimal organizer dashboard. Two capabilities only at first:

- Export submissions and feedback as CSV.
- Export mailing-list opt-ins in a format the organization's mailing
  tool ingests.

Plus an organizer-led agent invite flow scoped to their organization.
Event editing, settings, and full admin remain with the maintainer
until a later workstream.

Open questions during this workstream:

- Mailchimp default for the opt-in export, or another mailing tool?
- What is the exact minimum set of organizer dashboard capabilities
  Madrona needs for the maintainer to truly step back?

### Per-organization consent and branding

Status: not started

Consent copy templated per organization, naming the organization as the
data controller. Light branding under the organization's custom domain
— at least name and basic styling. Full white-label theming is a
non-goal in v1.

### Deferred — not in v1

These are real but explicitly out of scope until a stronger signal
arrives:

- Self-serve organization signup and white-label landing.
- Billing — both metering and payment collection.
- Multi-organization-per-user UI niceties such as an organization
  switcher.
- Vercel-API-driven custom-domain provisioning.
- Full per-organization theming beyond name and basic styling.

## Open Questions

These are not tied to a specific workstream and may resolve from
outside this work:

- Billing model when a second organization arrives. Free tier
  indefinitely, per-event pricing, per-organization subscription, or
  pass-through of platform costs?
- What an Agent can do day-of in product terms. Distinct conversation;
  affects the Agent role's capability set.

## Non-Goals

Captured to keep the roadmap honest:

- No policy framework on top of RLS.
- No multi-tenant-from-day-one without an anchor customer for whom the
  distinction matters.
- No full white-label theming in v1.
- No automated billing or self-serve organization provisioning.
- No promotion of `admin_users` into the tenant role hierarchy.
