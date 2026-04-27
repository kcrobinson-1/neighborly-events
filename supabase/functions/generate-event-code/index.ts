import { createClient } from "jsr:@supabase/supabase-js@2.101.1";
import {
  type AuthoringHttpDependencies,
  createAuthErrorResponse,
  createAuthoringPostHandler,
  defaultAuthoringHttpDependencies,
} from "../_shared/authoring-http.ts";
import { authenticateEventOrganizerOrAdmin } from "../_shared/event-organizer-auth.ts";

type GenerateEventCodeRequestBody = {
  eventId: string;
};

type EventCodePersistenceResult = {
  data: string | null;
  error: { message: string } | null;
};

export type GenerateEventCodeHandlerDependencies = {
  authenticateEventOrganizerOrAdmin: typeof authenticateEventOrganizerOrAdmin;
  authoringHttp: AuthoringHttpDependencies;
  generateEventCode: (
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<EventCodePersistenceResult>;
};

async function generateEventCode(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<EventCodePersistenceResult> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc("generate_random_event_code");

  if (error) {
    return { data: null, error };
  }

  if (typeof data !== "string") {
    return {
      data: null,
      error: { message: "Event code generation returned an invalid response." },
    };
  }

  return { data, error: null };
}

export const defaultGenerateEventCodeHandlerDependencies:
  GenerateEventCodeHandlerDependencies = {
    authenticateEventOrganizerOrAdmin,
    authoringHttp: defaultAuthoringHttpDependencies,
    generateEventCode,
  };

export function validateGenerateEventCodePayload(
  payload: unknown,
): GenerateEventCodeRequestBody | null {
  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    return null;
  }

  const eventId =
    typeof (payload as Partial<GenerateEventCodeRequestBody>).eventId ===
        "string"
      ? (payload as Partial<GenerateEventCodeRequestBody>).eventId?.trim()
      : "";

  if (!eventId) {
    return null;
  }

  return {
    eventId,
  };
}

/** Builds the request handler used by the authenticated event-code endpoint. */
export function createGenerateEventCodeHandler(
  dependencies: GenerateEventCodeHandlerDependencies =
    defaultGenerateEventCodeHandlerDependencies,
) {
  return createAuthoringPostHandler(
    dependencies.authoringHttp,
    async (request, context) => {
      const payload = validateGenerateEventCodePayload(
        await request.json().catch(() => null),
      );

      if (!payload) {
        return context.jsonResponse(
          400,
          { error: "Invalid generate-event-code payload." },
        );
      }

      const auth = await dependencies.authenticateEventOrganizerOrAdmin(
        request,
        payload.eventId,
        context.supabaseUrl,
        context.serviceRoleKey,
        context.supabaseClientKey,
      );

      if (auth.status !== "ok") {
        return createAuthErrorResponse(auth, context);
      }

      const { data, error } = await dependencies.generateEventCode(
        context.supabaseUrl,
        context.serviceRoleKey,
      );

      if (error || !data) {
        return context.jsonResponse(
          500,
          {
            details: error?.message,
            error: "We couldn't generate an event code right now.",
          },
        );
      }

      return context.jsonResponse(200, { eventCode: data });
    },
  );
}

/** Generates a non-persisted event-code suggestion for an authorized author. */
export const handleGenerateEventCodeRequest = createGenerateEventCodeHandler();

if (import.meta.main) {
  Deno.serve(handleGenerateEventCodeRequest);
}
