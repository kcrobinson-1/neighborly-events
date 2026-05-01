import { parseEventDate } from "./eventContent.ts";

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
 * Formats an ISO `yyyy-mm-dd` date range into a human-readable
 * display string (e.g., "Sep 26-27, 2026" or "Sep 30 – Oct 1, 2026").
 * Falls back to the raw strings if either endpoint fails calendar
 * validity through `parseEventDate` so a content-author typo never
 * produces broken output like `undefined 5, 2026`.
 *
 * Single source of truth so the page header
 * ([`EventHeader`](../components/event/EventHeader.tsx)) and the
 * Open Graph image
 * ([`EventOgImage`](./eventOgImage.tsx)) cannot drift on a content
 * change — extracted as part of M3 phase 3.1.2.
 */
export function formatHeroDateRange(start: string, end: string): string {
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
