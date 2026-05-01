import type { ReactElement } from "react";

import { parseEventDate, type EventContent } from "./eventContent.ts";
import { getThemeForSlug } from "../../../shared/styles/index.ts";

const monthAbbreviations = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Mirrors the page header's `formatHeroDateRange`
 * ([`EventHeader.tsx`](../components/event/EventHeader.tsx)) so the
 * OG image and the rendered page show the same date string. Kept
 * inline rather than extracted shared util per the M3 phase 3.1.2
 * plan's scope ("Files intentionally not touched: section components").
 */
function formatDateRange(start: string, end: string): string {
  const startDate = parseEventDate(start);
  const endDate = parseEventDate(end);

  if (!startDate || !endDate) {
    return start === end ? start : `${start} – ${end}`;
  }

  const startMonthName = monthAbbreviations[startDate.month - 1];
  const endMonthName = monthAbbreviations[endDate.month - 1];

  if (start === end) {
    return `${startMonthName} ${startDate.day}, ${startDate.year}`;
  }

  if (startDate.year !== endDate.year) {
    return `${startMonthName} ${startDate.day}, ${startDate.year} – ${endMonthName} ${endDate.day}, ${endDate.year}`;
  }

  if (startDate.month !== endDate.month) {
    return `${startMonthName} ${startDate.day} – ${endMonthName} ${endDate.day}, ${startDate.year}`;
  }

  return `${startMonthName} ${startDate.day}-${endDate.day}, ${startDate.year}`;
}

/**
 * Per-event Open Graph image content. The same React element backs
 * both `opengraph-image.tsx` and `twitter-image.tsx` so a content or
 * theme change cannot drift one card from the other (M3 phase 3.1.2
 * cross-cutting invariant: "OG and Twitter images render the same
 * content").
 *
 * Theme resolution reads `content.themeSlug`, **not** the URL slug,
 * so the `EventContent` contract permission for two events to share a
 * Theme registered under one key actually works. Wrong reading would
 * silently fall back to the platform Sage Civic Theme for any event
 * whose `themeSlug !== slug` and break the visual identity.
 *
 * Layout uses `display: flex` only — Satori (the rendering engine
 * inside `next/og`) supports flexbox plus a CSS subset that excludes
 * `display: grid` and many advanced layouts per the docs at
 * `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`
 * line 50. No font loading, no async, no hooks, no effects: the
 * function is pure and synchronous and stays under the Satori 500 KB
 * bundle ceiling without custom font weight.
 *
 * The helper has no caller until the file-convention image routes
 * import it (next commit on this branch).
 */
export function EventOgImage({
  content,
}: {
  content: EventContent;
}): ReactElement {
  const theme = getThemeForSlug(content.themeSlug);
  const dateRange = formatDateRange(
    content.hero.dates.start,
    content.hero.dates.end,
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: theme.bg,
        color: theme.text,
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: theme.primary,
            fontWeight: 600,
          }}
        >
          {dateRange}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 28,
            color: theme.text,
          }}
        >
          {content.hero.name}
        </div>
        {content.hero.tagline ? (
          <div
            style={{
              display: "flex",
              fontSize: 36,
              marginTop: 24,
              color: theme.text,
              opacity: 0.78,
            }}
          >
            {content.hero.tagline}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: theme.text,
            opacity: 0.85,
          }}
        >
          {content.hero.location}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: theme.primary,
            fontWeight: 600,
            letterSpacing: "0.08em",
          }}
        >
          NEIGHBORLY EVENTS
        </div>
      </div>
    </div>
  );
}
