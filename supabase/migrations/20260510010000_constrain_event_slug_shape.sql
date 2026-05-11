-- Constrain event slug shape at the storage layer.
--
-- Pairs with the shared `validateEventSlug` validator in `shared/urls/`
-- (called from `validateAuthoringGameDraftContent`) and the admin form's
-- `pattern` attribute. The CHECK constraints are the storage-layer
-- defense-in-depth: even if a future write path bypasses the parser,
-- the DB rejects malformed slugs before they reach printed QR URLs.
--
-- Shape: lowercase ASCII letters, digits, and hyphens; cannot start or
-- end with a hyphen; single-character allowed; capped at 64 characters.
-- Underscores are deliberately rejected even though URL-safe — every
-- shipped slug is hyphenated and consistency keeps QR/URL patterns
-- uniform. All current data (`harvest-block-party`, `riverside-jam`,
-- `community-checklist`, `first-sample`, `sponsor-spotlight`, `madrona`)
-- conforms, so the CHECKs apply cleanly without `NOT VALID` staging.

alter table public.game_event_drafts
  add constraint game_event_drafts_slug_format
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' and length(slug) <= 64);

alter table public.game_events
  add constraint game_events_slug_format
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' and length(slug) <= 64);

alter table public.feedback_enabled_events
  add constraint feedback_enabled_events_slug_format
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' and length(slug) <= 64);
