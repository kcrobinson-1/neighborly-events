import { assertEquals, assertExists } from "jsr:@std/assert@1";
import {
  createPublishDraftHandler,
  defaultPublishDraftHandlerDependencies,
} from "../../../supabase/functions/publish-draft/index.ts";
import {
  adminUserId,
  createAuthoringHttpDependencies,
  createAuthoringRequest,
  noopEvaluateDemoModeRejection,
  sampleDraft,
} from "./authoring-helpers.ts";

Deno.test("publish-draft rejects missing drafts", async () => {
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    loadDraft: async () => ({ data: null, error: null }),
    publishDraft: async () => {
      throw new Error("publishDraft should not be called");
    },
  });

  const response = await handler(
    createAuthoringRequest({ eventId: "missing" }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    details: "draft_not_found",
    error: "Draft content is invalid.",
  });
});

Deno.test("publish-draft rejects invalid draft content before publishing", async () => {
  let publishCalls = 0;
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    loadDraft: async () => ({
      data: {
        content: {
          ...sampleDraft,
          questions: [],
        },
        id: sampleDraft.id,
        name: sampleDraft.name,
        slug: sampleDraft.slug,
      },
      error: null,
    }),
    publishDraft: async () => {
      publishCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 400);
  assertExists((await response.json()).details);
  assertEquals(publishCalls, 0);
});

Deno.test("publish-draft calls the transactional RPC after authorization and shared validation pass", async () => {
  let capturedInput:
    | {
      actorUserId: string;
      eventId: string;
    }
    | null = null;
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    loadDraft: async () => ({
      data: {
        content: sampleDraft,
        id: sampleDraft.id,
        name: sampleDraft.name,
        slug: sampleDraft.slug,
      },
      error: null,
    }),
    publishDraft: async (eventId, actorUserId) => {
      capturedInput = {
        actorUserId,
        eventId,
      };

      return {
        data: {
          event_id: eventId,
          published_at: "2026-04-11T12:00:00.000Z",
          slug: sampleDraft.slug,
          version_number: 3,
        },
        error: null,
      };
    },
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    eventId: sampleDraft.id,
    publishedAt: "2026-04-11T12:00:00.000Z",
    slug: sampleDraft.slug,
    versionNumber: 3,
  });
  assertEquals(capturedInput, {
    actorUserId: adminUserId,
    eventId: sampleDraft.id,
  });
});

Deno.test("publish-draft returns the demo-mode 403 short-circuit before authentication when helper rejects", async () => {
  let authCalls = 0;
  let publishCalls = 0;
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => {
      authCalls += 1;
      throw new Error(
        "authenticateEventOrganizerOrAdmin should not be called once the demo-mode helper rejects",
      );
    },
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: async () => ({
      error: "demo_mode_read_only",
      message: "Demo mode — sign in to make changes.",
    }),
    loadDraft: async () => {
      throw new Error("loadDraft should not be called");
    },
    publishDraft: async () => {
      publishCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "demo_mode_read_only",
    message: "Demo mode — sign in to make changes.",
  });
  assertEquals(authCalls, 0);
  assertEquals(publishCalls, 0);
});

Deno.test("publish-draft preserves the existing 401 when the demo-mode helper defers (anon caller on a non-allowlist slug)", async () => {
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      error: "Authentication is required to author this event.",
      status: "unauthenticated",
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    loadDraft: async () => {
      throw new Error("loadDraft should not be called");
    },
    publishDraft: async () => {
      throw new Error("publishDraft should not be called");
    },
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), {
    error: "Authentication is required to author this event.",
  });
});

Deno.test("publish-draft falls through to the existing auth gate when the demo-mode helper defers (signed-in caller on an allowlist slug)", async () => {
  let authCalls = 0;
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => {
      authCalls += 1;
      return {
        status: "ok",
        userId: adminUserId,
      };
    },
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    loadDraft: async () => ({
      data: {
        content: sampleDraft,
        id: sampleDraft.id,
        name: sampleDraft.name,
        slug: sampleDraft.slug,
      },
      error: null,
    }),
    publishDraft: async () => ({
      data: {
        event_id: sampleDraft.id,
        published_at: "2026-05-03T12:00:00.000Z",
        slug: sampleDraft.slug,
        version_number: 1,
      },
      error: null,
    }),
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 200);
  assertEquals(authCalls, 1);
});

Deno.test("publish-draft reports slug collisions as 409", async () => {
  const handler = createPublishDraftHandler({
    ...defaultPublishDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    loadDraft: async () => ({
      data: {
        content: sampleDraft,
        id: sampleDraft.id,
        name: sampleDraft.name,
        slug: sampleDraft.slug,
      },
      error: null,
    }),
    publishDraft: async () => ({
      data: null,
      error: {
        message: "slug_collision",
      },
    }),
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    details: "slug_collision",
    error: "A game event already uses that slug.",
  });
});
