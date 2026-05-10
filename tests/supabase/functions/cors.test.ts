import {
  assertEquals,
  assertFalse,
  assertMatch,
} from "jsr:@std/assert@1";
import {
  createCorsHeaders,
  getAllowedOrigin,
} from "../../../supabase/functions/_shared/cors.ts";
import { createOriginRequest, withEnvironment } from "./helpers.ts";

const TEST_SCOPE = "myteam";

Deno.test("getAllowedOrigin uses the built-in allowlist when ALLOWED_ORIGINS is absent", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
    () => {
      const allowedRequest = createOriginRequest("https://example.com");
      const disallowedRequest = createOriginRequest(
        "https://example.com",
        {},
        "https://not-allowed.example",
      );

      assertEquals(getAllowedOrigin(allowedRequest), "http://127.0.0.1:4173");
      assertEquals(getAllowedOrigin(disallowedRequest), null);
    },
  );
});

Deno.test("getAllowedOrigin admits the canonical apps/site Vercel alias by default", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
    () => {
      const canonicalOrigin = "https://neighborly-events-site.vercel.app";
      const request = createOriginRequest(
        "https://example.com",
        {},
        canonicalOrigin,
      );

      assertEquals(getAllowedOrigin(request), canonicalOrigin);
    },
  );
});

Deno.test("getAllowedOrigin admits apps/site Vercel deployment-hash preview aliases when scope is configured", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
    () => {
      const previewOrigin =
        `https://neighborly-events-site-abc123def-${TEST_SCOPE}.vercel.app`;
      const request = createOriginRequest(
        "https://example.com",
        {},
        previewOrigin,
      );

      assertEquals(getAllowedOrigin(request), previewOrigin);
    },
  );
});

Deno.test("getAllowedOrigin admits apps/site Vercel git-branch preview aliases when scope is configured", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
    () => {
      const branchOrigin =
        `https://neighborly-events-site-git-feat-canonical-origin-flip-${TEST_SCOPE}.vercel.app`;
      const request = createOriginRequest(
        "https://example.com",
        {},
        branchOrigin,
      );

      assertEquals(getAllowedOrigin(request), branchOrigin);
    },
  );
});

Deno.test("getAllowedOrigin REJECTS preview aliases when APPS_SITE_VERCEL_SCOPE is unset (preview matcher is opt-in)", async () => {
  // Operator who doesn't configure APPS_SITE_VERCEL_SCOPE gets no
  // preview-alias admission. Falsifies any silent-default behavior.
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
    () => {
      const previewOrigin =
        `https://neighborly-events-site-abc123def-${TEST_SCOPE}.vercel.app`;
      const branchOrigin =
        `https://neighborly-events-site-git-main-${TEST_SCOPE}.vercel.app`;

      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, previewOrigin),
        ),
        null,
      );
      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, branchOrigin),
        ),
        null,
      );
    },
  );
});

Deno.test("getAllowedOrigin REJECTS preview aliases when ALLOWED_ORIGINS is set but APPS_SITE_VERCEL_SCOPE is unset (operator lockdown intent honored)", async () => {
  // Load-bearing P2 falsifier: an operator who explicitly pins
  // ALLOWED_ORIGINS for production lockdown gets exactly that set.
  // The preview matcher does not silently re-open access.
  await withEnvironment(
    {
      ALLOWED_ORIGINS: "https://operator-pinned.example",
      APPS_SITE_VERCEL_SCOPE: null,
    },
    () => {
      const previewOrigin =
        `https://neighborly-events-site-abc123def-${TEST_SCOPE}.vercel.app`;
      const request = createOriginRequest(
        "https://example.com",
        {},
        previewOrigin,
      );

      assertEquals(getAllowedOrigin(request), null);
    },
  );
});

Deno.test("getAllowedOrigin admits preview aliases alongside an explicit ALLOWED_ORIGINS set when both env vars are configured", async () => {
  // The two env vars are independent. Operator can pin a tight
  // production allowlist AND opt in to apps/site preview admission.
  await withEnvironment(
    {
      ALLOWED_ORIGINS: "https://operator-pinned.example",
      APPS_SITE_VERCEL_SCOPE: TEST_SCOPE,
    },
    () => {
      const previewOrigin =
        `https://neighborly-events-site-abc123def-${TEST_SCOPE}.vercel.app`;
      const pinnedOrigin = "https://operator-pinned.example";

      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, previewOrigin),
        ),
        previewOrigin,
      );
      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, pinnedOrigin),
        ),
        pinnedOrigin,
      );
    },
  );
});

Deno.test("getAllowedOrigin REJECTS apps/site preview aliases scoped to a different Vercel team (cross-team isolation)", async () => {
  // Load-bearing P1 falsifier: a different Vercel team that creates
  // a same-named project (`neighborly-events-site`) cannot use its
  // own preview deploys to call the Edge Functions. The scope segment
  // is pinned to the configured team's slug.
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
    () => {
      const otherTeamPreview =
        "https://neighborly-events-site-abc123def-othersteam.vercel.app";
      const otherTeamBranch =
        "https://neighborly-events-site-git-main-othersteam.vercel.app";

      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, otherTeamPreview),
        ),
        null,
      );
      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, otherTeamBranch),
        ),
        null,
      );
    },
  );
});

Deno.test("getAllowedOrigin rejects sibling Vercel project aliases that share apps/site's name prefix", async () => {
  // A hypothetical sibling project named `neighborly-events-site-extra`
  // would produce hostnames whose first segment after the apps/site
  // project token is `extra` — neither the literal `git` anchor nor a
  // 9-character deployment hash. The matcher MUST reject these.
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
    () => {
      const siblingDeploymentOrigin =
        `https://neighborly-events-site-extra-abc123def-${TEST_SCOPE}.vercel.app`;
      const siblingBranchOrigin =
        `https://neighborly-events-site-extra-git-main-${TEST_SCOPE}.vercel.app`;

      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, siblingDeploymentOrigin),
        ),
        null,
      );
      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, siblingBranchOrigin),
        ),
        null,
      );
    },
  );
});

Deno.test("getAllowedOrigin rejects unrelated *.vercel.app deployments", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
    () => {
      const unrelatedOrigin =
        `https://some-other-project-abc123def-${TEST_SCOPE}.vercel.app`;
      const request = createOriginRequest(
        "https://example.com",
        {},
        unrelatedOrigin,
      );

      assertEquals(getAllowedOrigin(request), null);
    },
  );
});

Deno.test("getAllowedOrigin rejects http:// preview-alias spoofs (https-only enforcement)", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
    () => {
      const httpSpoofOrigin =
        `http://neighborly-events-site-abc123def-${TEST_SCOPE}.vercel.app`;
      const request = createOriginRequest(
        "https://example.com",
        {},
        httpSpoofOrigin,
      );

      assertEquals(getAllowedOrigin(request), null);
    },
  );
});

Deno.test("getAllowedOrigin uses the configured allowlist when ALLOWED_ORIGINS is set", async () => {
  await withEnvironment(
    {
      ALLOWED_ORIGINS: "https://game.example, https://preview.example ",
      APPS_SITE_VERCEL_SCOPE: null,
    },
    () => {
      const configuredRequest = createOriginRequest(
        "https://example.com",
        {},
        "https://preview.example",
      );
      const defaultOnlyRequest = createOriginRequest("https://example.com");

      assertEquals(getAllowedOrigin(configuredRequest), "https://preview.example");
      assertEquals(getAllowedOrigin(defaultOnlyRequest), null);
    },
  );
});

Deno.test("createCorsHeaders reflects the allowed origin and shared trust headers", () => {
  const headersWithOrigin = createCorsHeaders("https://game.example");
  const headersWithoutOrigin = createCorsHeaders(null);

  assertEquals(headersWithOrigin["Access-Control-Allow-Origin"], "https://game.example");
  assertMatch(
    headersWithOrigin["Access-Control-Allow-Headers"],
    /x-neighborly-session/,
  );
  assertEquals(headersWithOrigin["Access-Control-Allow-Credentials"], "true");
  assertFalse("Access-Control-Allow-Origin" in headersWithoutOrigin);
});
