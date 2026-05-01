# `shared/db/`

Env-agnostic Supabase wiring shared across `apps/web` and `apps/site`.

## What this module owns

- `createBrowserSupabaseClient(config)` — the browser Supabase client
  factory. Takes a fully-resolved `SupabaseConfig` and returns a
  `SupabaseClient`. Holds no singleton state.
- `createSupabaseAuthHeaders(key)` — builds the shared `apikey` plus
  bearer-token header pair used for PostgREST reads and edge-function
  calls.
- `readSupabaseErrorMessage(response, fallback)` — extracts a useful
  error message from a Supabase-backed browser response, falling back
  to the supplied copy when the body is unparseable.
- The `SupabaseConfig` type — the shape every per-app adapter passes
  to the factory.

## What stays in per-app adapters

- Env reading (`import.meta.env.*` for Vite, `process.env.NEXT_PUBLIC_*`
  for Next.js client routes).
- The singleton lifecycle. Each browser app owns its own singleton.
- Framework-coupled gates: prototype-fallback flags, missing-config
  copy keyed off `import.meta.env.DEV`, etc.

The current adapters are
[`apps/web/src/lib/supabaseBrowser.ts`](/apps/web/src/lib/supabaseBrowser.ts)
and
[`apps/site/lib/supabaseBrowser.ts`](/apps/site/lib/supabaseBrowser.ts).

## Plan reference

[`docs/plans/shared-db-foundation.md`](/docs/plans/shared-db-foundation.md).
