import type { EventNight, EventNights } from "./eventContent.ts";
import { parseEventDate } from "./eventContent.ts";

/**
 * "Tonight" resolution for events that author per-night content
 * (`EventContent.nights`). The rule, stated once here and encoded in
 * `resolveTonight` below:
 *
 * - On a concert day — computed as a calendar date in the event's
 *   own `nights.timezone`, not the viewer's — the event page shows
 *   that night as **tonight** for the whole day and evening, flipping
 *   only at local midnight. Post-show visitors (quiz-takers,
 *   feedback-leavers at 10 PM) still see tonight's page.
 * - On any other day before the final night, the **next** night
 *   resolves as *upcoming* ("Next concert — …" framing is the
 *   renderer's job; this module only names the state and the night).
 * - After the final night's local midnight the season is over:
 *   *seasonWrap*, with no night attached.
 *
 * Everything here is a pure function of `(now, nights)` — no module
 * clock, no ambient timezone. The caller owns where `now` comes from
 * (client clock, request time, a mocked date in tests), which is what
 * keeps the flip-at-midnight boundaries unit-testable and lets a
 * statically-prerendered page re-resolve on the client.
 *
 * Timezone reads go through `Intl.DateTimeFormat` with the config's
 * IANA `timezone` — the one bounded exception to the site's
 * "renderer never interprets dates in a local timezone" rule, and it
 * interprets the *event's* zone, never the viewer's. An invalid IANA
 * name throws `RangeError` from `Intl` — loudly, at first resolve —
 * rather than silently resolving in the wrong zone; the content
 * tests pin each event's literal so a typo dies in CI, not on a
 * reader's phone.
 *
 * Nights whose `date` fails `parseEventDate` are skipped (degraded
 * state preferred over a fake — the same stance the section
 * renderers take on broken cross-references), and the input array is
 * never mutated or required to be pre-sorted: resolution sorts a
 * copy, so content authors can list nights in any order.
 */
export type TonightResolution =
  | { kind: "tonight"; night: EventNight }
  | { kind: "upcoming"; night: EventNight }
  | { kind: "seasonWrap" };

/**
 * The calendar date (`yyyy-mm-dd`) that `now` falls on in `timezone`.
 * Built from `formatToParts` output, not `format`, so no locale's
 * ordering or separators can leak into the string we compare against
 * content-authored ISO dates.
 *
 * Exported so a mounted renderer can cheaply detect that the event's
 * local day has rolled over (the resolved state is only ever stale
 * across a local midnight) without duplicating the `Intl` wiring or
 * re-running full resolution on a timer.
 */
export function calendarDateInZone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * The nights that participate in resolution — entries whose `date`
 * passes `parseEventDate`, sorted ascending, input untouched.
 * Exported for renderers that walk the season alongside the resolved
 * night (the This-season strip), so their walk and `resolveTonight`
 * cannot disagree on which nights exist or in what order.
 *
 * Sort comparison is lexical on ISO `yyyy-mm-dd` strings, which
 * orders correctly because `parseEventDate` has already guaranteed
 * the zero-padded shape for every survivor.
 */
export function resolvableNights(nights: EventNights): EventNight[] {
  return nights.nights
    .filter((night) => parseEventDate(night.date) !== null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Resolves which night an event page should treat as "tonight" at
 * the instant `now`, per the rule documented on `TonightResolution`.
 * Returns `seasonWrap` when `nights.nights` is empty or every entry
 * has an invalid date — an event with no resolvable nights has
 * nothing upcoming to show, and the renderer's wrap state is the
 * honest fallback.
 *
 * With duplicate dates the earliest-listed entry wins.
 */
export function resolveTonight(
  now: Date,
  nights: EventNights,
): TonightResolution {
  const today = calendarDateInZone(now, nights.timezone);

  const resolvable = resolvableNights(nights);

  const tonight = resolvable.find((night) => night.date === today);
  if (tonight) {
    return { kind: "tonight", night: tonight };
  }

  const upcoming = resolvable.find((night) => night.date > today);
  if (upcoming) {
    return { kind: "upcoming", night: upcoming };
  }

  return { kind: "seasonWrap" };
}

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Formats a night's ISO `yyyy-mm-dd` date as the display string the
 * Tonight section's headings use — "Tuesday, August 11" — so the
 * "Tonight · <label>" date line and the "Next concert — <date>"
 * title cannot drift on formatting. Year is deliberately omitted:
 * these strings are day-of copy, not archival captions.
 *
 * The weekday comes from a `Date.UTC` round-trip on the parsed
 * numeric components — the same bounded `Date` use `parseEventDate`
 * makes for calendar validity, never a local-timezone read — and
 * anything `parseEventDate` rejects falls back to the raw string,
 * matching `formatHeroDateRange`'s typo posture.
 */
export function formatNightDate(date: string): string {
  const parsed = parseEventDate(date);
  if (!parsed) {
    return date;
  }

  const weekday =
    weekdayNames[
      new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()
    ];

  return `${weekday}, ${monthNames[parsed.month - 1]} ${parsed.day}`;
}

/**
 * Compact form of a night's date for the This-season strip's cards —
 * "Aug 11". Same parse-or-raw-fallback posture as `formatNightDate`;
 * any uppercasing is the stylesheet's job (the display face is
 * caps-only anyway), so the string here stays readable in test
 * output and accessible names.
 */
export function formatNightDateShort(date: string): string {
  const parsed = parseEventDate(date);
  if (!parsed) {
    return date;
  }

  return `${monthNames[parsed.month - 1].slice(0, 3)} ${parsed.day}`;
}
