// Service-role seed script that authors and publishes the Madrona placeholder
// game content. Run once per environment (production, or any local Supabase
// the operator points the env vars at). The script is idempotent: re-running
// upserts the draft and publishes a new version; the live `game_events` row
// is replaced with the latest projection on each call.
//
// Authored by the Madrona demo-build epic M2 phase 2.1 — see
// docs/plans/epics/madrona-demo-build/m2-phase-2-1-plan.md for the contract
// and runbook.

const path = require("node:path");

const eventId = "madrona";
const slug = "madrona";
const eventCode = "MAD";
const schemaVersion = 1;

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function assertHttpsUrl(value, name) {
  if (!value.startsWith("https://")) {
    throw new Error(
      `${name} must start with https://; refusing to run against a non-https target.`,
    );
  }
}

function assertUuid(value, name) {
  // UUID pattern: 8-4-4-4-12 lowercase hex.
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRe.test(value)) {
    throw new Error(`${name} must be a valid UUID; received "${value}".`);
  }
}

function logStep(message) {
  process.stdout.write(`[seed-madrona] ${message}\n`);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${init && init.method ? init.method : "GET"} ${url} failed: status=${
        response.status
      } body=${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }

  return body;
}

async function loadDemoContent() {
  // The placeholder content lives as a typed module at
  // shared/events/madrona-demo-game-content.ts so the TypeScript validator
  // runs at lint time. The script loads it via dynamic ESM import; Node 24+
  // strips TS types natively, so no build step is needed for this seed.
  const moduleUrl = new URL(
    `file://${path.resolve(
      __dirname,
      "..",
      "..",
      "shared",
      "events",
      "madrona-demo-game-content.ts",
    )}`,
  );

  const mod = await import(moduleUrl.href);

  if (!mod.madronaDemoGameContent) {
    throw new Error(
      "Loaded shared/events/madrona-demo-game-content.ts but did not find " +
        "the `madronaDemoGameContent` export.",
    );
  }

  return mod.madronaDemoGameContent;
}

async function main() {
  const supabaseUrl = readRequiredEnv("TEST_SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = readRequiredEnv("TEST_SUPABASE_SERVICE_ROLE_KEY");
  const publishedByUserId = readRequiredEnv("MADRONA_PUBLISHED_BY_USER_ID");

  assertHttpsUrl(supabaseUrl, "TEST_SUPABASE_URL");
  assertUuid(publishedByUserId, "MADRONA_PUBLISHED_BY_USER_ID");

  const host = new URL(supabaseUrl).host;
  logStep(`Resolving Madrona seed against ${host}`);

  const baseHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const content = await loadDemoContent();

  if (content.id !== eventId) {
    throw new Error(
      `madronaDemoGameContent.id is "${content.id}"; expected "${eventId}".`,
    );
  }

  if (content.slug !== slug) {
    throw new Error(
      `madronaDemoGameContent.slug is "${content.slug}"; expected "${slug}".`,
    );
  }

  // 1. Check event_code collision: any row holding "MAD" whose id/slug differs
  //    from "madrona" aborts the run.
  logStep(`Checking event_code "${eventCode}" for collisions`);

  const collisionRows = await fetchJson(
    `${supabaseUrl}/rest/v1/game_events?select=id,slug,event_code&event_code=eq.${eventCode}`,
    { headers: { ...baseHeaders } },
  );

  const collidingEvent = Array.isArray(collisionRows)
    ? collisionRows.find((row) => row.id !== eventId && row.slug !== slug)
    : null;

  if (collidingEvent) {
    throw new Error(
      `event_code "${eventCode}" is already held by event_id="${
        collidingEvent.id
      }" slug="${collidingEvent.slug}". Pick a different code in seed-madrona-demo-content.cjs.`,
    );
  }

  const collidingDraftRows = await fetchJson(
    `${supabaseUrl}/rest/v1/game_event_drafts?select=id,slug,event_code&event_code=eq.${eventCode}`,
    { headers: { ...baseHeaders } },
  );

  const collidingDraft = Array.isArray(collidingDraftRows)
    ? collidingDraftRows.find((row) => row.id !== eventId && row.slug !== slug)
    : null;

  if (collidingDraft) {
    throw new Error(
      `event_code "${eventCode}" is already held by draft_id="${
        collidingDraft.id
      }" slug="${collidingDraft.slug}". Pick a different code.`,
    );
  }

  // 2. Upsert the draft row keyed on id="madrona".
  logStep(`Upserting game_event_drafts row id="${eventId}"`);

  const draftRow = {
    id: eventId,
    slug,
    event_code: eventCode,
    name: content.name,
    schema_version: schemaVersion,
    content,
  };

  await fetchJson(`${supabaseUrl}/rest/v1/game_event_drafts`, {
    method: "POST",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(draftRow),
  });

  // 3. Invoke publish_game_event_draft.
  logStep(`Invoking publish_game_event_draft RPC`);

  const publishResult = await fetchJson(
    `${supabaseUrl}/rest/v1/rpc/publish_game_event_draft`,
    {
      method: "POST",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_event_id: eventId,
        p_published_by: publishedByUserId,
      }),
    },
  );

  logStep(`publish RPC returned: ${JSON.stringify(publishResult)}`);

  // 4. Verify the published row is present.
  logStep(`Verifying public.game_events row for slug="${slug}"`);

  const verifyRows = await fetchJson(
    `${supabaseUrl}/rest/v1/game_events?select=id,slug,event_code,name,published_at&slug=eq.${slug}`,
    { headers: { ...baseHeaders } },
  );

  if (!Array.isArray(verifyRows) || verifyRows.length === 0) {
    throw new Error(
      `Verification failed: no game_events row found for slug="${slug}" after publish.`,
    );
  }

  const verifyRow = verifyRows[0];

  if (!verifyRow.published_at) {
    throw new Error(
      `Verification failed: game_events.published_at is null for slug="${slug}".`,
    );
  }

  const questionRows = await fetchJson(
    `${supabaseUrl}/rest/v1/game_questions?select=id,display_order&event_id=eq.${eventId}&order=display_order.asc`,
    { headers: { ...baseHeaders } },
  );

  if (!Array.isArray(questionRows) || questionRows.length === 0) {
    throw new Error(
      `Verification failed: no game_questions rows found for event_id="${eventId}" after publish.`,
    );
  }

  logStep(
    `Verified slug="${slug}" published_at=${verifyRow.published_at} questions=${questionRows.length}`,
  );

  logStep("Seed complete.");
}

main().catch((error) => {
  process.stderr.write(`[seed-madrona] failed: ${error.message}\n`);
  process.exit(1);
});
