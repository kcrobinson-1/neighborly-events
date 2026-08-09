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

Deno.test("getAllowedOrigin uses the built-in defaults when EXTRA_ALLOWED_ORIGINS is absent", async () => {
  await withEnvironment(
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
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

Deno.test("getAllowedOrigin admits the Madrona organizer origin by default (in code, not via EXTRA_ALLOWED_ORIGINS)", async () => {
  // Load-bearing falsifier for the phase-1 contract: the organizer
  // origin is admitted with BOTH env vars unset. If this entry had been
  // put in `EXTRA_ALLOWED_ORIGINS` instead of the in-code allowlist,
  // this assertion fails.
  await withEnvironment(
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
    () => {
      const organizerOrigin = "https://music.madrona.us";
      const request = createOriginRequest(
        "https://example.com",
        {},
        organizerOrigin,
      );

      assertEquals(getAllowedOrigin(request), organizerOrigin);
    },
  );
});

Deno.test("getAllowedOrigin REJECTS organizer-domain hosts that are not the exact allowlisted origin", async () => {
  // Admission is exact-string membership, not a domain rule. Nothing
  // keys on "is this a custom domain" or on the registrable domain, so
  // the apex, an unlisted subdomain, an http:// spoof, and a suffix
  // lookalike registered by someone else all stay rejected.
  await withEnvironment(
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
    () => {
      const rejected = [
        "https://madrona.us",
        "https://www.madrona.us",
        "https://other.madrona.us",
        "http://music.madrona.us",
        "https://music.madrona.us.evil.example",
        "https://music.madrona.us:8443",
      ];

      for (const origin of rejected) {
        assertEquals(
          getAllowedOrigin(
            createOriginRequest("https://example.com", {}, origin),
          ),
          null,
          `expected ${origin} to be rejected`,
        );
      }
    },
  );
});

Deno.test("getAllowedOrigin admits apps/site Vercel deployment-hash preview aliases when scope is configured", async () => {
  await withEnvironment(
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: null },
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

Deno.test("getAllowedOrigin still REJECTS preview aliases when EXTRA_ALLOWED_ORIGINS is set but APPS_SITE_VERCEL_SCOPE is unset (env vars are independent axes)", async () => {
  // The two env vars admit on independent paths: setting
  // EXTRA_ALLOWED_ORIGINS adds those exact origins to the explicit
  // allowlist; it does not silently enable the preview matcher. A
  // preview alias not listed verbatim in EXTRA_ALLOWED_ORIGINS only
  // gets admitted via the matcher, which requires APPS_SITE_VERCEL_SCOPE.
  await withEnvironment(
    {
      EXTRA_ALLOWED_ORIGINS: "https://operator-extra.example",
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

Deno.test("getAllowedOrigin admits preview aliases alongside EXTRA_ALLOWED_ORIGINS extras when both env vars are configured", async () => {
  // The two env vars are independent. Operator can add explicit extras
  // AND opt in to apps/site preview admission. Both paths admit; the
  // canonical-origin defaults remain admitted alongside.
  await withEnvironment(
    {
      EXTRA_ALLOWED_ORIGINS: "https://operator-extra.example",
      APPS_SITE_VERCEL_SCOPE: TEST_SCOPE,
    },
    () => {
      const previewOrigin =
        `https://neighborly-events-site-abc123def-${TEST_SCOPE}.vercel.app`;
      const extraOrigin = "https://operator-extra.example";
      const canonicalOrigin = "https://neighborly-events-site.vercel.app";

      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, previewOrigin),
        ),
        previewOrigin,
      );
      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, extraOrigin),
        ),
        extraOrigin,
      );
      assertEquals(
        getAllowedOrigin(
          createOriginRequest("https://example.com", {}, canonicalOrigin),
        ),
        canonicalOrigin,
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
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
    { EXTRA_ALLOWED_ORIGINS: null, APPS_SITE_VERCEL_SCOPE: TEST_SCOPE },
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

Deno.test("getAllowedOrigin unions EXTRA_ALLOWED_ORIGINS with the in-code defaults (additive semantics)", async () => {
  // Load-bearing falsifier for the ALLOWED_ORIGINS → EXTRA_ALLOWED_ORIGINS
  // rename: setting the env var must not drop a default origin. An
  // operator who supplies extras still gets the canonical apps/site
  // alias and the localhost dev hosts admitted alongside the extras.
  // Whitespace and trailing commas in the env var value are tolerated.
  await withEnvironment(
    {
      EXTRA_ALLOWED_ORIGINS: "https://game.example, https://preview.example ,",
      APPS_SITE_VERCEL_SCOPE: null,
    },
    () => {
      const extraRequest = createOriginRequest(
        "https://example.com",
        {},
        "https://preview.example",
      );
      const defaultLocalhostRequest = createOriginRequest("https://example.com");
      const defaultCanonicalRequest = createOriginRequest(
        "https://example.com",
        {},
        "https://neighborly-events-site.vercel.app",
      );
      const unrelatedRequest = createOriginRequest(
        "https://example.com",
        {},
        "https://not-allowed.example",
      );

      assertEquals(getAllowedOrigin(extraRequest), "https://preview.example");
      assertEquals(getAllowedOrigin(defaultLocalhostRequest), "http://127.0.0.1:4173");
      assertEquals(
        getAllowedOrigin(defaultCanonicalRequest),
        "https://neighborly-events-site.vercel.app",
      );
      assertEquals(getAllowedOrigin(unrelatedRequest), null);
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
