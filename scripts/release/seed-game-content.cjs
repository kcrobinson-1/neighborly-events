// Service-role seed script that authors and publishes one event's game
// content. Generic over events: takes a `--content <path>` argument
// pointing at a TypeScript module that exports
// `seedConfig: GameSeedConfig` (see shared/events/seed-config.ts).
// Run once per environment per event; the script is idempotent
// (subsequent runs upsert the draft and publish a new version).
//
// Authored by the Madrona demo-build epic M2 phase 2.1 — see
// docs/plans/epics/madrona-demo-build/m2-phase-2-1-plan.md for the
// contract and runbook.

const path = require("node:path");

const schemaVersion = 1;

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

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

function assertSeedConfig(value, source) {
  if (!value || typeof value !== "object") {
    throw new Error(
      `${source} did not export a \`seedConfig\` object; got ${typeof value}.`,
    );
  }

  if (typeof value.eventCode !== "string" || value.eventCode.length !== 3) {
    throw new Error(
      `${source} \`seedConfig.eventCode\` must be a 3-character string; got ${JSON.stringify(
        value.eventCode,
      )}.`,
    );
  }

  if (value.eventCode !== value.eventCode.toUpperCase()) {
    throw new Error(
      `${source} \`seedConfig.eventCode\` must be uppercase; got ${JSON.stringify(
        value.eventCode,
      )}.`,
    );
  }

  const content = value.content;

  if (!content || typeof content !== "object") {
    throw new Error(
      `${source} \`seedConfig.content\` must be an object; got ${typeof content}.`,
    );
  }

  if (typeof content.id !== "string" || content.id.length === 0) {
    throw new Error(
      `${source} \`seedConfig.content.id\` must be a non-empty string.`,
    );
  }

  if (typeof content.slug !== "string" || content.slug.length === 0) {
    throw new Error(
      `${source} \`seedConfig.content.slug\` must be a non-empty string.`,
    );
  }

  if (typeof content.name !== "string" || content.name.length === 0) {
    throw new Error(
      `${source} \`seedConfig.content.name\` must be a non-empty string.`,
    );
  }
}

function logStep(message) {
  process.stdout.write(`[seed-game-content] ${message}\n`);
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

async function loadSeedConfig(contentArg) {
  if (!contentArg) {
    throw new Error(
      "Missing --content <path>. Pass a TypeScript module that exports `seedConfig: GameSeedConfig`.",
    );
  }

  const resolvedPath = path.resolve(process.cwd(), contentArg);
  const moduleUrl = new URL(`file://${resolvedPath}`);
  const mod = await import(moduleUrl.href);

  assertSeedConfig(mod.seedConfig, contentArg);

  return { resolvedPath, seedConfig: mod.seedConfig };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = readRequiredEnv("TEST_SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = readRequiredEnv("TEST_SUPABASE_SERVICE_ROLE_KEY");
  const publishedByUserId = readRequiredEnv("GAME_SEED_PUBLISHED_BY_USER_ID");

  assertHttpsUrl(supabaseUrl, "TEST_SUPABASE_URL");
  assertUuid(publishedByUserId, "GAME_SEED_PUBLISHED_BY_USER_ID");

  const { resolvedPath, seedConfig } = await loadSeedConfig(args.content);
  const { eventCode, content } = seedConfig;
  const eventId = content.id;
  const slug = content.slug;

  const host = new URL(supabaseUrl).host;
  logStep(
    `Resolving seed for event_id="${eventId}" slug="${slug}" event_code="${eventCode}" against ${host}`,
  );
  logStep(`Loaded seedConfig from ${resolvedPath}`);

  const baseHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // 1. Check event_code collision: any row holding this code whose id/slug
  //    differs from the seed's aborts the run.
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
      }" slug="${collidingEvent.slug}". Pick a different code in the seed module.`,
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

  // 2. Upsert the draft row keyed on the seed's content.id.
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

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`[seed-game-content] failed: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  assertHttpsUrl,
  assertSeedConfig,
  assertUuid,
  parseArgs,
};
