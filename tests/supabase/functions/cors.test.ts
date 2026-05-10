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

Deno.test("getAllowedOrigin uses the built-in allowlist when ALLOWED_ORIGINS is absent", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    const allowedRequest = createOriginRequest("https://example.com");
    const disallowedRequest = createOriginRequest(
      "https://example.com",
      {},
      "https://not-allowed.example",
    );

    assertEquals(getAllowedOrigin(allowedRequest), "http://127.0.0.1:4173");
    assertEquals(getAllowedOrigin(disallowedRequest), null);
  });
});

Deno.test("getAllowedOrigin admits the canonical apps/site Vercel alias by default", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    const canonicalOrigin = "https://neighborly-events-site.vercel.app";
    const request = createOriginRequest(
      "https://example.com",
      {},
      canonicalOrigin,
    );

    assertEquals(getAllowedOrigin(request), canonicalOrigin);
  });
});

Deno.test("getAllowedOrigin admits apps/site Vercel deployment-hash preview aliases", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    const previewOrigin =
      "https://neighborly-events-site-abc123def-myteam.vercel.app";
    const request = createOriginRequest(
      "https://example.com",
      {},
      previewOrigin,
    );

    assertEquals(getAllowedOrigin(request), previewOrigin);
  });
});

Deno.test("getAllowedOrigin admits apps/site Vercel git-branch preview aliases", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    const branchOrigin =
      "https://neighborly-events-site-git-feat-canonical-origin-flip-myteam.vercel.app";
    const request = createOriginRequest(
      "https://example.com",
      {},
      branchOrigin,
    );

    assertEquals(getAllowedOrigin(request), branchOrigin);
  });
});

Deno.test("getAllowedOrigin admits preview aliases even when ALLOWED_ORIGINS pins explicit origins", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: "https://operator-pinned.example" },
    () => {
      const previewOrigin =
        "https://neighborly-events-site-abc123def-myteam.vercel.app";
      const request = createOriginRequest(
        "https://example.com",
        {},
        previewOrigin,
      );

      assertEquals(getAllowedOrigin(request), previewOrigin);
    },
  );
});

Deno.test("getAllowedOrigin rejects sibling Vercel project aliases that share apps/site's name prefix", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    // A hypothetical sibling project named `neighborly-events-site-extra`
    // would produce hostnames whose first segment after the apps/site
    // project token is `extra` — neither the literal `git` anchor nor a
    // 9-character deployment hash. The matcher MUST reject these.
    const siblingDeploymentOrigin =
      "https://neighborly-events-site-extra-abc123def-myteam.vercel.app";
    const siblingBranchOrigin =
      "https://neighborly-events-site-extra-git-main-myteam.vercel.app";
    const siblingRequest = createOriginRequest(
      "https://example.com",
      {},
      siblingDeploymentOrigin,
    );
    const siblingBranchRequest = createOriginRequest(
      "https://example.com",
      {},
      siblingBranchOrigin,
    );

    assertEquals(getAllowedOrigin(siblingRequest), null);
    assertEquals(getAllowedOrigin(siblingBranchRequest), null);
  });
});

Deno.test("getAllowedOrigin rejects unrelated *.vercel.app deployments", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    const unrelatedOrigin =
      "https://some-other-project-abc123def-myteam.vercel.app";
    const request = createOriginRequest(
      "https://example.com",
      {},
      unrelatedOrigin,
    );

    assertEquals(getAllowedOrigin(request), null);
  });
});

Deno.test("getAllowedOrigin rejects http:// preview-alias spoofs (https-only enforcement)", async () => {
  await withEnvironment({ ALLOWED_ORIGINS: null }, () => {
    const httpSpoofOrigin =
      "http://neighborly-events-site-abc123def-myteam.vercel.app";
    const request = createOriginRequest(
      "https://example.com",
      {},
      httpSpoofOrigin,
    );

    assertEquals(getAllowedOrigin(request), null);
  });
});

Deno.test("getAllowedOrigin uses the configured allowlist when ALLOWED_ORIGINS is set", async () => {
  await withEnvironment(
    { ALLOWED_ORIGINS: "https://game.example, https://preview.example " },
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
