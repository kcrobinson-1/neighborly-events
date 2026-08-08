import { describe, expect, it } from "vitest";
import {
  parseSourceLine,
  splitExplanationParagraphs,
  type SourceSegment,
} from "../../../shared/game-config/questionNarrative.ts";

// Copy in these tests is invented rather than drawn from any event's real
// source list: the shapes are what matter, and coupling the parser's tests to
// one event's citations would make a copy edit look like a parser regression.

function linkSegments(segments: SourceSegment[]) {
  return segments.filter((segment) => segment.kind === "link");
}

function plainText(segments: SourceSegment[]) {
  return segments
    .map((segment) => (segment.kind === "link" ? "" : segment.text))
    .join("");
}

describe("splitExplanationParagraphs", () => {
  it("returns a single paragraph unchanged", () => {
    expect(splitExplanationParagraphs("One paragraph.")).toEqual([
      "One paragraph.",
    ]);
  });

  it("splits on a blank line", () => {
    expect(splitExplanationParagraphs("First.\n\nSecond.")).toEqual([
      "First.",
      "Second.",
    ]);
  });

  it("does not split on a single newline", () => {
    expect(splitExplanationParagraphs("First.\nStill first.")).toHaveLength(1);
  });

  it("trims surrounding whitespace and drops empty paragraphs", () => {
    expect(splitExplanationParagraphs("  First.  \n\n   \n\n  Second. ")).toEqual(
      ["First.", "Second."],
    );
  });

  it("returns nothing for an empty explanation", () => {
    expect(splitExplanationParagraphs("   ")).toEqual([]);
  });
});

describe("parseSourceLine", () => {
  it("parses one link with surrounding text", () => {
    const { bareAddresses, rejectedLinkTargets, segments } = parseSourceLine(
      "A. Author, [The Title](https://example.org/piece), A Journal, 2019",
    );

    const links = linkSegments(segments);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      href: "https://example.org/piece",
      isPdf: false,
      kind: "link",
    });
    expect(plainText(links[0].kind === "link" ? links[0].label : [])).toBe(
      "The Title",
    );
    expect(plainText(segments)).toBe("A. Author, , A Journal, 2019");
    expect(bareAddresses).toEqual([]);
    expect(rejectedLinkTargets).toEqual([]);
  });

  it("parses two links in one entry, in order, with the text between them", () => {
    const { segments } = parseSourceLine(
      "Author, [First](https://example.org/a) and [Second](https://example.org/b) sheets, An Archive",
    );

    expect(segments.map((segment) => segment.kind)).toEqual([
      "text",
      "link",
      "text",
      "link",
      "text",
    ]);
    expect(linkSegments(segments).map((segment) =>
      segment.kind === "link" ? segment.href : null,
    )).toEqual(["https://example.org/a", "https://example.org/b"]);
  });

  it("parses emphasis inside a link label", () => {
    const { segments } = parseSourceLine(
      "T. Author, [*A Book Title*](https://example.org/book), A Press, 2009",
    );

    const [link] = linkSegments(segments);
    expect(link.kind === "link" && link.label).toEqual([
      { kind: "emphasis", text: "A Book Title" },
    ]);
  });

  it("parses emphasis outside any link", () => {
    const { segments } = parseSourceLine(
      "T. Author, *A Book Title*, A University Press",
    );

    expect(linkSegments(segments)).toHaveLength(0);
    expect(segments).toContainEqual({ kind: "emphasis", text: "A Book Title" });
  });

  it("treats a print entry with no link as plain text and reports nothing", () => {
    const line = "T. Author, *A Book*, A University Press";
    const { bareAddresses, rejectedLinkTargets, segments } = parseSourceLine(line);

    expect(linkSegments(segments)).toHaveLength(0);
    expect(bareAddresses).toEqual([]);
    expect(rejectedLinkTargets).toEqual([]);
  });

  it("detects a PDF target", () => {
    const { segments } = parseSourceLine("[Sheet](https://example.org/a/file.pdf)");
    const [link] = linkSegments(segments);

    expect(link.kind === "link" && link.isPdf).toBe(true);
  });

  it("detects a PDF target carrying a query string", () => {
    const { segments } = parseSourceLine(
      "[Sheet](https://example.org/a/file.pdf?download=1)",
    );
    const [link] = linkSegments(segments);

    expect(link.kind === "link" && link.isPdf).toBe(true);
  });

  it("does not treat a path merely containing pdf as a PDF", () => {
    const { segments } = parseSourceLine("[Page](https://example.org/pdf-guide)");
    const [link] = linkSegments(segments);

    expect(link.kind === "link" && link.isPdf).toBe(false);
  });

  it("refuses a non-web scheme, degrading to the label and never emitting the target", () => {
    const { bareAddresses, rejectedLinkTargets, segments } = parseSourceLine(
      "[Click me](javascript:alert)",
    );

    expect(linkSegments(segments)).toHaveLength(0);
    expect(rejectedLinkTargets).toEqual(["javascript:alert"]);
    expect(plainText(segments)).toBe("Click me");
    expect(plainText(segments)).not.toContain("javascript:");
    // A refusal is reported once, as a refusal — never also as a bare address.
    expect(bareAddresses).toEqual([]);
  });

  it("refuses a scheme-relative target", () => {
    const { rejectedLinkTargets, segments } = parseSourceLine(
      "[Title](//example.org/piece)",
    );

    expect(linkSegments(segments)).toHaveLength(0);
    expect(rejectedLinkTargets).toEqual(["//example.org/piece"]);
  });

  it("reports the address an unclosed link leaves behind", () => {
    const { bareAddresses, rejectedLinkTargets, segments } = parseSourceLine(
      "Author, [The Title](https://example.org/piece, A Journal",
    );

    expect(linkSegments(segments)).toHaveLength(0);
    expect(rejectedLinkTargets).toEqual([]);
    expect(bareAddresses).toEqual(["https://example.org/piece,"]);
  });

  it("reports a plainly pasted address with no markup at all", () => {
    const { bareAddresses } = parseSourceLine(
      "Author, see https://example.org/piece for the piece",
    );

    expect(bareAddresses).toEqual(["https://example.org/piece"]);
  });

  it("reports a bare www address", () => {
    const { bareAddresses } = parseSourceLine("Author, www.example.org/piece");

    expect(bareAddresses).toEqual(["www.example.org/piece"]);
  });

  it.each([
    ["HTTPS://example.org/piece"],
    ["Https://example.org/piece"],
    ["WWW.example.org/piece"],
  ])("reports the bare address %s whatever its case", (address) => {
    const { bareAddresses } = parseSourceLine(`Author, see ${address}`);

    expect(bareAddresses).toEqual([address]);
  });

  // Emphasis tokenizing used to split an address across segments, and each
  // piece matched nothing alone: `https://` has nothing after the scheme, and
  // `example.org` has no scheme. The renderer joins them back into a visible
  // address, so the scan reads the authored text rather than the segments.
  it.each([
    ["https://*example.org*", "https://example.org"],
    ["Author, *www*.example.org/piece", "Author, www.example.org/piece"],
    ["see *https*://example.org/piece", "see https://example.org/piece"],
  ])("reports the address in %s, which emphasis splits", (line, rendered) => {
    const { bareAddresses, segments } = parseSourceLine(line);

    // What the renderer would put on screen still contains the raw address,
    // which is the thing the guard exists to keep out.
    expect(
      segments
        .filter((segment) => segment.kind !== "link")
        .map((segment) => segment.text)
        .join(""),
    ).toBe(rendered);
    expect(bareAddresses).not.toEqual([]);
  });

  it("does not report a refused link's target as a bare address", () => {
    const { bareAddresses, rejectedLinkTargets } = parseSourceLine(
      "Author, [The Title](ftp://example.org/piece), A Journal",
    );

    expect(rejectedLinkTargets).toEqual(["ftp://example.org/piece"]);
    expect(bareAddresses).toEqual([]);
  });

  it("accepts an uppercase scheme inside link markup, so the guard must match it", () => {
    // `new URL` lowercases the scheme, so this target is a valid link. The
    // bare-address guard has to be case-insensitive for the same reason, or
    // the identical address prints as plain text once it falls outside markup.
    const { bareAddresses, rejectedLinkTargets, segments } = parseSourceLine(
      "Author, [The Title](HTTPS://example.org/piece)",
    );

    expect(linkSegments(segments)).toHaveLength(1);
    expect(rejectedLinkTargets).toEqual([]);
    expect(bareAddresses).toEqual([]);
  });

  it("renders unmatched brackets literally without reporting anything", () => {
    const line = "Author, [The Title, A Journal";
    const { bareAddresses, rejectedLinkTargets, segments } = parseSourceLine(line);

    expect(plainText(segments)).toBe(line);
    expect(bareAddresses).toEqual([]);
    expect(rejectedLinkTargets).toEqual([]);
  });

  it("returns nothing for an empty line", () => {
    expect(parseSourceLine("")).toEqual({
      bareAddresses: [],
      rejectedLinkTargets: [],
      segments: [],
    });
  });
});
