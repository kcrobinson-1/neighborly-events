# Debugging Workflow

Stub — content will land in a follow-up commit per
[`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md)
Execution Step 4.

This file will carry the debugging discipline: read the actual
error before making any change; the canonical post-CI debugging
context is the `Report CI Failure To PR` comment; stop after at
most one speculative attempt if the failure-comment is missing;
flag commits whose connection to the observed failure isn't
directly traceable; undo speculative commits from the same
debugging session after finding the real cause; and the
local-vs-CI baseline gotchas (`service_role` grants,
`has_table_privilege` semantics in pgTAP).
