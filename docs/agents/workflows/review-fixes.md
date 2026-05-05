# Review-Fix Workflow

Per-session-type playbook for addressing PR review feedback. Layer
this on top of the relevant base workflow
([`implementation.md`](./implementation.md) for code-side fixes,
[`plan-implementation.md`](./plan-implementation.md) for fixes
that re-touch a documented plan).

## Review-Fix Rigor

Review-fix commits do not get a lighter diligence standard than the original
implementation. Treat them as full-quality engineering work, not as quick
patches.

- run the same design and self-review depth on a review fix that you would run
  on the original implementation for the same surface area
- do not accept a review fix that introduces a new bug at a higher severity
  than the issue being addressed; explicitly check for that before committing
- when a fix adds a new async step, follow-up read, fallback path, or external
  dependency, review the success path, the originally reported bug, the inverse
  case, transient failure of the new dependency, and partial-success semantics
- after fixing a reviewer-surfaced defect, audit the rest of the plan or diff
  for siblings of the same class before committing the fix. Reviewer feedback
  usually surfaces one instance of a recurring mistake; the same mistake often
  lives in places the reviewer didn't reach. Ask: "what category of mistake is
  this, and where else might that category live?" — then check those places.
  Recurring trap: M2 phase 2.3's `vercel dev` claim was fixed in one paragraph,
  but the same "treating tool output as proof without checking what it proves"
  defect lived two paragraphs later in the 404-fingerprint check; catching the
  second pre-emptively saves the next reviewer round
- if a write already succeeded, do not let a best-effort follow-up read or
  reconciliation step make the overall operation appear failed unless the plan
  explicitly says the flow is atomic
- add or update focused coverage for the new edge introduced by the fix, not
  only for the reviewer's reported reproduction
- before committing a review fix, answer: "What new bug could this fix create?"
  and "Could this make a successful operation look failed?"

## GitHub thread state discipline

When the user asks you to address pull-request review feedback, keep the GitHub
thread state readable for humans:

- after pushing a fix for a specific review thread, reply on that exact GitHub
  thread with a short summary of what changed and the commit SHA that addressed
  it
- if a thread is pushback or defer rather than a code fix, reply on the thread
  with the rationale instead of leaving the decision only in local handoff text
- do not resolve threads, submit a review, or mark conversations resolved
  unless the user explicitly asks for that write action
- when summarizing PR review state to the user, distinguish clearly between
  live GitHub review threads and pasted review text supplied in chat
