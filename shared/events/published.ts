import {
  mapPublishedGameRowsToGameConfig,
  type FeedbackMode,
  type GameConfig,
  type PublishedGameEventRow,
  type PublishedGameOptionRow,
  type PublishedGameQuestionRow,
} from "../game-config";
import {
  createSupabaseAuthHeaders,
  readSupabaseErrorMessage,
} from "../db";
import { readSharedEventsProviders } from "./configure.ts";

/**
 * Shared public event-content read boundary. Owns remote Supabase reads only;
 * app-local prototype fallback decisions stay in per-app binding modules.
 */
type PublishedGameSummaryRow = Pick<
  PublishedGameEventRow,
  "id" | "slug" | "name" | "summary" | "feedback_mode"
>;

/** Minimal published event summary shown on the landing page. */
export type PublishedGameSummary = {
  feedbackMode: FeedbackMode;
  id: string;
  name: string;
  slug: string;
  summary: string;
};

function createPostgrestUrl(path: string) {
  return new URL(`${readSharedEventsProviders().getConfig().supabaseUrl}/rest/v1/${path}`);
}

async function fetchPostgrestRows<T>(
  path: string,
  searchParams: Record<string, string>,
  fallbackMessage: string,
) {
  const providers = readSharedEventsProviders();
  const { enabled, supabaseClientKey } = providers.getConfig();

  if (!enabled) {
    throw new Error(providers.getMissingConfigMessage());
  }

  const url = createPostgrestUrl(path);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: createSupabaseAuthHeaders(supabaseClientKey),
  });

  if (!response.ok) {
    throw new Error(await readSupabaseErrorMessage(response, fallbackMessage));
  }

  return (await response.json()) as T;
}

function compareGameSummaries(left: PublishedGameSummary, right: PublishedGameSummary) {
  const featuredGameSlug = readSharedEventsProviders().getFeaturedGameSlug();

  if (left.slug === featuredGameSlug) {
    return -1;
  }

  if (right.slug === featuredGameSlug) {
    return 1;
  }

  return left.name.localeCompare(right.name);
}

/** Lists the published event summaries shown on the demo landing page. */
export async function listPublishedGameSummaries(): Promise<PublishedGameSummary[]> {
  const eventRows = await fetchPostgrestRows<PublishedGameSummaryRow[]>(
    "game_events",
    {
      published_at: "not.is.null",
      select: "id,slug,name,summary,feedback_mode",
    },
    "We couldn't load the published demo events right now.",
  );

  return eventRows
    .map((event) => ({
      feedbackMode: event.feedback_mode,
      id: event.id,
      name: event.name,
      slug: event.slug,
      summary: event.summary,
    }))
    .sort(compareGameSummaries);
}

/** Loads the published event content needed to play one route slug. */
export async function loadPublishedGameBySlug(slug: string): Promise<GameConfig | null> {
  const eventRows = await fetchPostgrestRows<PublishedGameEventRow[]>(
    "game_events",
    {
      published_at: "not.is.null",
      select: [
        "id",
        "slug",
        "name",
        "location",
        "estimated_minutes",
        "entitlement_label",
        "intro",
        "summary",
        "feedback_mode",
        "allow_back_navigation",
        "allow_retake",
      ].join(","),
      slug: `eq.${slug}`,
    },
    "We couldn't load this game event right now.",
  );

  const eventRow = eventRows[0];

  if (!eventRow) {
    return null;
  }

  const [questionRows, optionRows] = await Promise.all([
    fetchPostgrestRows<PublishedGameQuestionRow[]>(
      "game_questions",
      {
        event_id: `eq.${eventRow.id}`,
        order: "display_order.asc",
        select: [
          "event_id",
          "id",
          "display_order",
          "sponsor",
          "prompt",
          "selection_mode",
          "explanation",
          "sponsor_fact",
        ].join(","),
      },
      "We couldn't load this game event right now.",
    ),
    fetchPostgrestRows<PublishedGameOptionRow[]>(
      "game_question_options",
      {
        event_id: `eq.${eventRow.id}`,
        order: "question_id.asc,display_order.asc",
        select: "event_id,question_id,id,display_order,label,is_correct",
      },
      "We couldn't load this game event right now.",
    ),
  ]);

  try {
    return mapPublishedGameRowsToGameConfig({
      event: eventRow,
      options: optionRows,
      questions: questionRows,
    });
  } catch {
    throw new Error("This game event is misconfigured right now.");
  }
}
