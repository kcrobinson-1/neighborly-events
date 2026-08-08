/**
 * Pure parsing for the narrative half of a question: the explanation's
 * paragraph structure, and the inline grammar of a source line.
 *
 * This module lives in shared rather than in the web app because two
 * consumers must agree on one rule: draft validation decides which source
 * lines may be saved, and the renderer decides what a saved line becomes on
 * screen. Two implementations of "is this link target acceptable" would drift,
 * so there is one, and both call it.
 *
 * The grammar is deliberately small — emphasis and inline links, nothing else.
 * Anything unrecognised is returned as literal text rather than throwing: the
 * renderer must still produce something safe for content that predates a rule
 * or arrives by a path validation did not cover. Validation is the first line
 * of defence, this degrade path is the second.
 */

/** One inline run of text inside a source line or a link label. */
export type SourceTextSegment = {
  kind: "emphasis" | "text";
  text: string;
};

/** One inline piece of a rendered source line. */
export type SourceSegment =
  | SourceTextSegment
  | {
      href: string;
      isPdf: boolean;
      kind: "link";
      label: SourceTextSegment[];
    };

/**
 * A parsed source line plus two findings validation consumes and the renderer
 * ignores. `rejectedLinkTargets` are targets that were refused and already
 * degraded to plain text in `segments`. `bareAddresses` are addresses left
 * sitting in the plain-text remainder — the residue of markup the link pattern
 * did not match, which would otherwise print on screen.
 */
export type ParsedSourceLine = {
  bareAddresses: string[];
  rejectedLinkTargets: string[];
  segments: SourceSegment[];
};

// A link target may not contain whitespace or parentheses. No Madrona target
// does; a target that did would fail to match and render literally, which the
// bare-address rule below then rejects at authoring time rather than printing.
const LINK_PATTERN = /\[([^\]]+)\]\(([^\s()]+)\)/g;
// Emphasis does not nest and does not span a link boundary.
const EMPHASIS_PATTERN = /\*([^*]+)\*/g;
// Catches what an unclosed link leaves behind: `[Title](https://host` matches
// no link, falls through to the plain-text path, and would print its address.
// Case-insensitive to match `readTarget`, which parses through `new URL` and so
// accepts `HTTPS://host` as a link. A case-sensitive guard here would let the
// same uppercase address through as plain text.
const BARE_ADDRESS_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;

/** Splits a run of plain text into text and emphasis segments. */
function parseEmphasis(text: string): SourceTextSegment[] {
  const segments: SourceTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(EMPHASIS_PATTERN)) {
    const start = match.index ?? 0;

    if (start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, start) });
    }

    segments.push({ kind: "emphasis", text: match[1] });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }

  return segments;
}

/** Parses a link target, returning null when it is not a URL at all. */
function readTarget(href: string) {
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

/** True only for ordinary web targets; everything else is refused. */
function isAcceptableTarget(url: URL | null) {
  return url !== null && (url.protocol === "https:" || url.protocol === "http:");
}

/** Splits one authored source line into renderable inline pieces. */
export function parseSourceLine(line: string): ParsedSourceLine {
  const segments: SourceSegment[] = [];
  const rejectedLinkTargets: string[] = [];
  let cursor = 0;

  for (const match of line.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;

    if (start > cursor) {
      segments.push(...parseEmphasis(line.slice(cursor, start)));
    }

    const [, label, href] = match;
    const url = readTarget(href);

    if (isAcceptableTarget(url)) {
      segments.push({
        href,
        isPdf: (url as URL).pathname.toLowerCase().endsWith(".pdf"),
        kind: "link",
        label: parseEmphasis(label),
      });
    } else {
      // Degrade to the label text. The refused target never reaches `segments`,
      // so it can neither render as an anchor nor print as an address.
      rejectedLinkTargets.push(href);
      segments.push(...parseEmphasis(label));
    }

    cursor = start + match[0].length;
  }

  if (cursor < line.length) {
    segments.push(...parseEmphasis(line.slice(cursor)));
  }

  // Scan only the non-link pieces. A refused link contributes its label here
  // but not its target, so a refusal is never also reported as a bare address.
  const bareAddresses = segments
    .filter((segment): segment is SourceTextSegment => segment.kind !== "link")
    .flatMap((segment) => segment.text.match(BARE_ADDRESS_PATTERN) ?? []);

  return { bareAddresses, rejectedLinkTargets, segments };
}

/** Splits an explanation into paragraphs on blank lines. */
export function splitExplanationParagraphs(explanation: string): string[] {
  return explanation
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
