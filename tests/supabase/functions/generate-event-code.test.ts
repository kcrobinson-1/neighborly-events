import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import {
  createGenerateEventCodeHandler,
  defaultGenerateEventCodeHandlerDependencies,
  validateGenerateEventCodePayload,
} from "../../../supabase/functions/generate-event-code/index.ts";
import {
  adminUserId,
  createAuthoringHttpDependencies,
  createAuthoringRequest,
  sampleDraft,
} from "./authoring-helpers.ts";
import { createOriginRequest } from "./helpers.ts";

Deno.test("validateGenerateEventCodePayload requires an eventId", () => {
  assertEquals(validateGenerateEventCodePayload(null), null);
  assertEquals(validateGenerateEventCodePayload({}), null);
  assertEquals(validateGenerateEventCodePayload({ eventId: 123 }), null);
  assertEquals(validateGenerateEventCodePayload({ eventId: "" }), null);
  assertEquals(validateGenerateEventCodePayload({ eventId: "  " }), null);
  assertEquals(
    validateGenerateEventCodePayload({ eventId: " evt-1 " }),
    { eventId: "evt-1" },
  );
});

Deno.test("generate-event-code rejects unsupported methods after the origin gate", async () => {
  const handler = createGenerateEventCodeHandler({
    ...defaultGenerateEventCodeHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => {
      throw new Error("authenticateEventOrganizerOrAdmin should not be called");
    },
    authoringHttp: createAuthoringHttpDependencies(),
    generateEventCode: async () => {
      throw new Error("generateEventCode should not be called");
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", { method: "GET" }),
  );

  assertEquals(response.status, 405);
  assertEquals(await response.json(), { error: "Method not allowed." });
});

Deno.test("generate-event-code rejects payloads without eventId before authentication", async () => {
  const handler = createGenerateEventCodeHandler({
    ...defaultGenerateEventCodeHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => {
      throw new Error("authenticateEventOrganizerOrAdmin should not be called");
    },
    authoringHttp: createAuthoringHttpDependencies(),
    generateEventCode: async () => {
      throw new Error("generateEventCode should not be called");
    },
  });

  const response = await handler(createAuthoringRequest({}));

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    error: "Invalid generate-event-code payload.",
  });
});

Deno.test("generate-event-code rejects missing authentication", async () => {
  const handler = createGenerateEventCodeHandler({
    ...defaultGenerateEventCodeHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      error: "Authentication is required to author this event.",
      status: "unauthenticated",
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    generateEventCode: async () => {
      throw new Error("generateEventCode should not be called");
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

Deno.test("generate-event-code returns an unpersisted event-code suggestion", async () => {
  const handler = createGenerateEventCodeHandler({
    ...defaultGenerateEventCodeHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    generateEventCode: async () => ({
      data: "XYZ",
      error: null,
    }),
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );
  const payload = await response.json();

  assertEquals(response.status, 200);
  assertEquals(payload, { eventCode: "XYZ" });
  assertMatch(payload.eventCode, /^[A-Z]{3}$/);
});

Deno.test("generate-event-code reports generation failures", async () => {
  const handler = createGenerateEventCodeHandler({
    ...defaultGenerateEventCodeHandlerDependencies,
    authenticateEventOrganizerOrAdmin: async () => ({
      status: "ok",
      userId: adminUserId,
    }),
    authoringHttp: createAuthoringHttpDependencies(),
    generateEventCode: async () => ({
      data: null,
      error: { message: "rpc failed" },
    }),
  });

  const response = await handler(
    createAuthoringRequest({ eventId: sampleDraft.id }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    details: "rpc failed",
    error: "We couldn't generate an event code right now.",
  });
});
