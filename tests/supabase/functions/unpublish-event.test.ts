import { assertEquals } from "jsr:@std/assert@1";
import {
  createUnpublishEventHandler,
  defaultUnpublishEventHandlerDependencies,
} from "../../../supabase/functions/unpublish-event/index.ts";
import {
  adminUserId,
  createAuthoringHttpDependencies,
  createAuthoringRequest,
  noopEvaluateDemoModeRejection,
  sampleDraft,
} from "./authoring-helpers.ts";

Deno.test("unpublish-event rejects authenticated callers who are neither organizer nor root-admin before persistence", async () => {
  let unpublishCalls = 0;
  const handler = createUnpublishEventHandler({
    ...defaultUnpublishEventHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      error: "This account is not authorized to author this event.",
      status: "forbidden",
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    unpublishEvent: async () => {
      unpublishCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "This account is not authorized to author this event.",
  });
  assertEquals(unpublishCalls, 0);
});

Deno.test("unpublish-event calls only the unpublish RPC for authorized callers", async () => {
  let capturedInput:
    | {
      actorUserId: string;
      eventId: string;
    }
    | null = null;
  const handler = createUnpublishEventHandler({
    ...defaultUnpublishEventHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    unpublishEvent: async (eventId, actorUserId) => {
      capturedInput = {
        actorUserId,
        eventId,
      };

      return {
        data: {
          event_id: eventId,
          unpublished_at: "2026-04-11T12:05:00.000Z",
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
    unpublishedAt: "2026-04-11T12:05:00.000Z",
  });
  assertEquals(capturedInput, {
    actorUserId: adminUserId,
    eventId: sampleDraft.id,
  });
});

Deno.test("unpublish-event returns the demo-mode 403 short-circuit before authentication when helper rejects", async () => {
  let authCalls = 0;
  let unpublishCalls = 0;
  const handler = createUnpublishEventHandler({
    ...defaultUnpublishEventHandlerDependencies,
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
    unpublishEvent: async () => {
      unpublishCalls += 1;
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
  assertEquals(unpublishCalls, 0);
});

Deno.test("unpublish-event preserves the existing 401 when the demo-mode helper defers (anon caller on a non-allowlist slug)", async () => {
  const handler = createUnpublishEventHandler({
    ...defaultUnpublishEventHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      error: "Authentication is required to author this event.",
      status: "unauthenticated",
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    unpublishEvent: async () => {
      throw new Error("unpublishEvent should not be called");
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

Deno.test("unpublish-event falls through to the existing auth gate when the demo-mode helper defers (signed-in caller on an allowlist slug)", async () => {
  let authCalls = 0;
  const handler = createUnpublishEventHandler({
    ...defaultUnpublishEventHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => {
      authCalls += 1;
      return {
        status: "ok",
        userId: adminUserId,
      };
    },
    authoringHttp: createAuthoringHttpDependencies(),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    unpublishEvent: async (eventId) => ({
      data: {
        event_id: eventId,
        unpublished_at: "2026-05-03T12:05:00.000Z",
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
