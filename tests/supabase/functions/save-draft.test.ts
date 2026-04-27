import { assertEquals, assertExists } from "jsr:@std/assert@1";
import {
  createSaveDraftHandler,
  defaultSaveDraftHandlerDependencies,
  validateDraftSavePayload,
} from "../../../supabase/functions/save-draft/index.ts";
import {
  adminUserId,
  createAuthoringHttpDependencies,
  createAuthoringRequest,
  sampleDraft,
} from "./authoring-helpers.ts";

Deno.test("validateDraftSavePayload requires a content property", () => {
  assertEquals(validateDraftSavePayload(null), null);
  assertEquals(validateDraftSavePayload({}), null);
  assertEquals(validateDraftSavePayload({ content: sampleDraft }), {
    content: sampleDraft,
    eventCode: null,
  });
  assertEquals(validateDraftSavePayload({ content: sampleDraft, eventCode: " ABC " }), {
    content: sampleDraft,
    eventCode: "ABC",
  });
  assertEquals(validateDraftSavePayload({ content: sampleDraft, eventCode: "" }), {
    content: sampleDraft,
    eventCode: null,
  });
  assertEquals(validateDraftSavePayload({ content: sampleDraft, eventCode: 123 }), null);
});

Deno.test("save-draft rejects missing authentication", async () => {
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      error: "Authentication is required to author this event.",
      status: "unauthenticated",
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => {
      throw new Error("saveDraft should not be called");
    },
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), {
    error: "Authentication is required to author this event.",
  });
});

Deno.test("save-draft rejects authenticated callers who are neither organizer nor root-admin", async () => {
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      error: "This account is not authorized to author this event.",
      status: "forbidden",
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => {
      throw new Error("saveDraft should not be called");
    },
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "This account is not authorized to author this event.",
  });
});

Deno.test("save-draft rejects payloads without content.id before authentication", async () => {
  let authCalls = 0;
  let parseCalls = 0;
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => {
      authCalls += 1;
      throw new Error(
        "authenticateEventOrganizerOrAdmin should not be called for payloads " +
          "without content.id (auth gate must precede deep draft parsing)",
      );
    },
    authoringHttp: createAuthoringHttpDependencies(),
    parseAuthoringGameDraftContent: () => {
      parseCalls += 1;
      throw new Error(
        "parseAuthoringGameDraftContent should not be called for payloads " +
          "without content.id (deep parse must follow successful auth)",
      );
    },
    saveDraft: async () => {
      throw new Error("saveDraft should not be called");
    },
  });

  const response = await handler(
    createAuthoringRequest({
      content: { name: "no id here" },
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(authCalls, 0);
  assertEquals(parseCalls, 0);
  assertExists((await response.json()).details);
});

Deno.test("save-draft rejects malformed draft content before persistence", async () => {
  let saveCalls = 0;
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => {
      saveCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createAuthoringRequest({
      content: {
        ...sampleDraft,
        questions: [],
      },
    }),
  );

  assertEquals(response.status, 400);
  assertExists((await response.json()).details);
  assertEquals(saveCalls, 0);
});

Deno.test("save-draft upserts the normalized draft and returns a safe summary", async () => {
  let capturedInput:
    | {
      actorUserId: string;
      content: typeof sampleDraft;
      eventCode: string | null;
    }
    | null = null;
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async (input) => {
      capturedInput = input;

      return {
        data: {
          event_code: "TST",
          id: input.content.id,
          last_published_version_number: 2,
          name: input.content.name,
          slug: input.content.slug,
          updated_at: "2026-04-11T12:00:00.000Z",
        },
        error: null,
      };
    },
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    eventCode: "TST",
    hasBeenPublished: true,
    id: sampleDraft.id,
    lastPublishedVersionNumber: 2,
    name: sampleDraft.name,
    slug: sampleDraft.slug,
    updatedAt: "2026-04-11T12:00:00.000Z",
  });
  assertEquals(capturedInput, {
    actorUserId: adminUserId,
    content: sampleDraft,
    eventCode: null,
  });
});

Deno.test("save-draft passes supplied event codes to persistence", async () => {
  let capturedEventCode: string | null = null;
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async (input) => {
      capturedEventCode = input.eventCode;

      return {
        data: {
          event_code: "ABC",
          id: input.content.id,
          last_published_version_number: null,
          name: input.content.name,
          slug: input.content.slug,
          updated_at: "2026-04-11T12:00:00.000Z",
        },
        error: null,
      };
    },
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft, eventCode: "ABC" }),
  );

  assertEquals(response.status, 200);
  assertEquals(capturedEventCode, "ABC");
});

Deno.test("save-draft rejects invalid event codes before persistence", async () => {
  let saveCalls = 0;
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => {
      saveCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft, eventCode: "abc" }),
  );

  assertEquals(response.status, 422);
  assertEquals(await response.json(), {
    details: "event_code_invalid",
    error: "Event codes are exactly 3 uppercase letters.",
  });
  assertEquals(saveCalls, 0);
});

Deno.test("save-draft rejects slug changes on published events as 422", async () => {
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => ({
      data: null,
      error: {
        code: "slug_locked",
        message: "Slug cannot be changed after the event has been published.",
      },
    }),
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft }),
  );

  assertEquals(response.status, 422);
  assertEquals(await response.json(), {
    details: "Slug cannot be changed after the event has been published.",
    error: "The slug cannot be changed after the event has been published.",
  });
});

Deno.test("save-draft rejects event code changes on published events as 422", async () => {
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => ({
      data: null,
      error: {
        code: "event_code_locked",
        message: "Event code cannot be changed after the event has been published.",
      },
    }),
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft, eventCode: "ABC" }),
  );

  assertEquals(response.status, 422);
  assertEquals(await response.json(), {
    details: "Event code cannot be changed after the event has been published.",
    error: "Event code can't change after the event is published.",
  });
});

Deno.test("save-draft reports slug conflicts as 409", async () => {
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => ({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    }),
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft }),
  );

  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    details: "duplicate key value violates unique constraint",
    error: "A game event already uses that slug.",
  });
});

Deno.test("save-draft reports event code conflicts as 409", async () => {
  const handler = createSaveDraftHandler({
    ...defaultSaveDraftHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    saveDraft: async () => ({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "game_event_drafts_event_code_key"',
      },
    }),
  });

  const response = await handler(
    createAuthoringRequest({ content: sampleDraft, eventCode: "ABC" }),
  );

  assertEquals(response.status, 409);
  assertEquals(await response.json(), {
    details:
      'duplicate key value violates unique constraint "game_event_drafts_event_code_key"',
    error: "That code is already used by another event. Try a different one.",
  });
});
