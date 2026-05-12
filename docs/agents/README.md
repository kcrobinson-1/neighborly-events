# Agent Guidance

Map of `docs/agents/`:

- [`workflows/`](./workflows/) — per-session-type playbooks. The
  routing table in [`AGENTS.md`](/AGENTS.md) names which file an
  agent reads for the work at hand.
- [`planning/`](./planning/) — planning meta-process across epic
  / milestone / task plan / phase plan levels. `planning/shared.md`
  carries cross-level rules that every plan-drafting session
  loads; `planning/plan.md` carries the implementation-layer
  rules (Planning Depth, the `` `In draft` → `Proposed` ``
  promotion gate, the Plan-to-PR Completion Gate) that bind task
  and phase plans alike.
- [`reference/`](./reference/) — topic-organized constraint sets
  that workflow files route to at the appropriate session moment
  (pre-edit gate, mid-session, per-commit, PR open). Despite the
  name, these are not optional lookups; see each file for its
  triggering surface and load moment.

Universal rules (pre-edit gate, scope guardrails, sub-agent
delegation, stop-and-report, anti-patterns, change boundaries)
live in [`AGENTS.md`](/AGENTS.md) at the repo root and apply to
every session.
