import { type GameConfig } from "../../../../shared/game-config";
import {
  listPublishedGameSummaries as listRemotePublishedGameSummaries,
  loadPublishedGameBySlug as loadRemotePublishedGameBySlug,
  type PublishedGameSummary,
} from "../../../../shared/events";
import { featuredGameSlug, games, getGameBySlug } from "../data/games";
import { isPrototypeFallbackEnabled } from "./supabaseBrowser";

/**
 * apps/web published-content binding. Owns the Vite-only local prototype
 * fallback branch and delegates remote Supabase reads to `shared/events/`.
 */

export type { PublishedGameSummary };

function mapGameToSummary(game: GameConfig): PublishedGameSummary {
  return {
    feedbackMode: game.feedbackMode,
    id: game.id,
    name: game.name,
    slug: game.slug,
    summary: game.summary,
  };
}

function compareGameSummaries(left: PublishedGameSummary, right: PublishedGameSummary) {
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
  if (isPrototypeFallbackEnabled()) {
    return [...games].map(mapGameToSummary).sort(compareGameSummaries);
  }

  return await listRemotePublishedGameSummaries();
}

/** Loads the published event content needed to play one route slug. */
export async function loadPublishedGameBySlug(slug: string): Promise<GameConfig | null> {
  if (isPrototypeFallbackEnabled()) {
    return getGameBySlug(slug) ?? null;
  }

  return await loadRemotePublishedGameBySlug(slug);
}
