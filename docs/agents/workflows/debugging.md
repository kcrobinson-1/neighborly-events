# Debugging Workflow

Per-session-type playbook for diagnosing a failing validation, CI
run, or local test. Layer this on top of the relevant base workflow
([`implementation.md`](./implementation.md) for code-side
investigation, [`plan-implementation.md`](./plan-implementation.md)
for plan-implementing PRs whose CI failed).

## Debugging Discipline

When a validation step (CI, a local test, a runtime assertion) fails, the next
action must be informed by the actual error, not by a hypothesis about what
the error might be.

- If CI logs are accessible (local run, attached output, pasted excerpt), read
  them before making any change.
- For a failing PR CI run, the canonical source of post-CI debugging context
  is the automated `Report CI Failure To PR` comment posted by the
  `report-ci-failure` job in [`.github/workflows/ci.yml`](/.github/workflows/ci.yml).
  The comment names
  the failing step, links to the run, and carries a tail of failed-step
  output. Read that comment first and reason from its content. Note that
  the reporter shipped without a pre-merge throwaway-failure exercise, so
  if a real CI failure produces no comment or a malformed comment, treat
  it as a same-day patch surface on the reporter rather than a stable
  contract — the underlying failure is still on the Actions tab.
- If the failure-comment is genuinely missing or its content is not
  readable from the session for any reason, stop after at most one
  speculative attempt and ask the human for the log content before
  continuing. Stacked guess-and-push attempts pollute the PR history with
  commits that later need to be reverted and waste both agent time and
  human review attention.
- When you do push a fix whose connection to the observed failure is not
  directly traceable to a specific line of error output, say so in the commit
  body and flag that the commit may need to be reverted if the real cause
  turns out to be elsewhere.
- After finding the real cause, undo speculative commits from the same
  debugging session instead of leaving them in the tree. A clean final tree
  is more valuable than a clean history: a forward-revert commit that
  restores the pre-speculation state is acceptable; a rewritten history via
  force-push is acceptable only with explicit human permission.
- When a local test passes but CI fails, verify the local environment
  actually exercises the same baseline state CI does. Two gotchas this
  repository has already hit:
  - `has_table_privilege('service_role', ..., 'UPDATE')` assertions pass
    vacuously in a bare PostgreSQL shell because `service_role` has no
    grants at all; the real CI environment applies Supabase's baseline
    `grant all on all tables in schema public to service_role`, which
    flips the assertion. When asserting "role X does not have privilege
    Y," reproduce the baseline grant locally before trusting a green run.
  - pgTAP's `has_table_privilege(role, table, 'SELECT,INSERT,DELETE')`
    returns true if **any** of the privileges are held, not all. Split
    into per-privilege checks when the intent is "all of these are
    granted."
