/** Discriminated union returned by the monitoring-page search parser. */
export type SearchParseResult =
  | { type: "no_filter" }
  | { suffix: string; type: "suffix_match" }
  | { type: "cross_event_mismatch" };

/**
 * Parses a monitoring-page search input against the locked event's acronym.
 *
 * Normalization follows design doc §6: trim surrounding whitespace, uppercase
 * the full input, strip the optional dash between acronym and suffix, and
 * require the four-digit suffix. A mismatched acronym collapses into a
 * `cross_event_mismatch` sentinel — never an error, never a "exists in another
 * event" hint.
 */
export function parseSearchInput(
  input: string,
  lockedEventCode: string,
): SearchParseResult {
  const normalized = input.trim().toUpperCase();

  if (normalized === "") {
    return { type: "no_filter" };
  }

  const pureSuffixMatch = /^\d{4}$/.exec(normalized);
  if (pureSuffixMatch) {
    return { suffix: normalized, type: "suffix_match" };
  }

  const acronymAndSuffixMatch = /^([A-Z]+)\s*-?\s*(\d{4})$/.exec(normalized);
  if (acronymAndSuffixMatch) {
    const [, acronym, suffix] = acronymAndSuffixMatch;
    if (acronym === lockedEventCode) {
      return { suffix, type: "suffix_match" };
    }
    return { type: "cross_event_mismatch" };
  }

  return { type: "no_filter" };
}
