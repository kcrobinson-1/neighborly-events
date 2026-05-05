# Validation Reference

Stub — content will land in a follow-up commit per
[`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md)
Execution Step 3.

This file will carry: the per-area validation commands
(`npm run lint`, `npm run build:web`, `deno check
supabase/functions/...` paths), Validation Honesty (don't overstate
what was validated; new top-level paths run via the integrated
repo command, not the new subcommand alone; clean-start exercise
when relevant), Continuous Validation (run checks before each
commit on multi-file work, not only at handoff), Regression
Discipline (validate teardown for new helper scripts that start
local services, fresh-start vs warm-start awareness), PR Readiness,
and Testing Tiers Discipline (plans gate merge only on tiers the
implementer can execute pre-merge; production smoke is post-deploy
per [`docs/testing-tiers.md`](/docs/testing-tiers.md)). Loaded
mid-session (Continuous Validation before each commit) and at
end-of-session (PR Readiness) by workflows/.
