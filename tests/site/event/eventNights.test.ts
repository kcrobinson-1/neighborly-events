import { describe, expect, it } from "vitest";

import { harvestBlockPartyContent } from "../../../apps/site/events/harvest-block-party.ts";
import { madronaContent } from "../../../apps/site/events/madrona.ts";
import { riversideJamContent } from "../../../apps/site/events/riverside-jam.ts";
import type {
  EventNight,
  EventNights,
} from "../../../apps/site/lib/eventContent.ts";
import { parseEventDate } from "../../../apps/site/lib/eventContent.ts";
import {
  formatNightDate,
  resolveTonight,
} from "../../../apps/site/lib/eventNights.ts";

/**
 * Minimal night factory for resolver tests — the resolver only
 * reads `date`, so the rest can stay constant.
 */
function night(date: string, label = "Night"): EventNight {
  return { date, label, performerSlug: "someone", runOfShow: [] };
}

/**
 * The madrona schedule shape, rebuilt synthetically so the resolver
 * tests stay decoupled from content edits: three Tuesdays in
 * America/Los_Angeles (UTC-7 in August — every instant below is
 * authored as the UTC equivalent of a Pacific wall-clock time).
 */
const tuesdays: EventNights = {
  timezone: "America/Los_Angeles",
  nights: [night("2026-08-11"), night("2026-08-18"), night("2026-08-25")],
};

describe("resolveTonight", () => {
  it("resolves a pre-season day to the first night as upcoming", () => {
    // Thu Aug 6, noon PT.
    const result = resolveTonight(new Date("2026-08-06T19:00:00Z"), tuesdays);
    expect(result.kind).toBe("upcoming");
    expect(result.kind === "upcoming" && result.night.date).toBe("2026-08-11");
  });

  it("computes 'today' in the event timezone, not UTC", () => {
    // 2026-08-11T05:00Z is already concert Tuesday in UTC but still
    // Mon Aug 10, 10 PM in Los Angeles — the night must not resolve
    // as tonight yet.
    const result = resolveTonight(new Date("2026-08-11T05:00:00Z"), tuesdays);
    expect(result.kind).toBe("upcoming");
    expect(result.kind === "upcoming" && result.night.date).toBe("2026-08-11");
  });

  it("flips to tonight at local midnight on a concert Tuesday", () => {
    // Tue Aug 11, 00:00 PT.
    const result = resolveTonight(new Date("2026-08-11T07:00:00Z"), tuesdays);
    expect(result.kind).toBe("tonight");
    expect(result.kind === "tonight" && result.night.date).toBe("2026-08-11");
  });

  it("holds tonight through 23:59 PT on the concert day", () => {
    // Tue Aug 11, 23:59 PT — post-show quiz-takers still see tonight.
    const result = resolveTonight(new Date("2026-08-12T06:59:00Z"), tuesdays);
    expect(result.kind).toBe("tonight");
    expect(result.kind === "tonight" && result.night.date).toBe("2026-08-11");
  });

  it("flips to the next night at midnight PT after a concert", () => {
    // Wed Aug 12, 00:00 PT.
    const result = resolveTonight(new Date("2026-08-12T07:00:00Z"), tuesdays);
    expect(result.kind).toBe("upcoming");
    expect(result.kind === "upcoming" && result.night.date).toBe("2026-08-18");
  });

  it("resolves a between-concerts day to the next night", () => {
    // Sat Aug 15, noon PT.
    const result = resolveTonight(new Date("2026-08-15T19:00:00Z"), tuesdays);
    expect(result.kind).toBe("upcoming");
    expect(result.kind === "upcoming" && result.night.date).toBe("2026-08-18");
  });

  it("holds the final night as tonight through 23:59 PT on Aug 25", () => {
    const result = resolveTonight(new Date("2026-08-26T06:59:00Z"), tuesdays);
    expect(result.kind).toBe("tonight");
    expect(result.kind === "tonight" && result.night.date).toBe("2026-08-25");
  });

  it("enters season wrap at midnight PT after the final night", () => {
    // Wed Aug 26, 00:00 PT.
    expect(resolveTonight(new Date("2026-08-26T07:00:00Z"), tuesdays)).toEqual({
      kind: "seasonWrap",
    });
  });

  it("stays in season wrap long after the season", () => {
    expect(resolveTonight(new Date("2026-12-25T20:00:00Z"), tuesdays)).toEqual({
      kind: "seasonWrap",
    });
  });

  it("returns the registered night object, not a copy", () => {
    // Referential identity so renderers can compare against the
    // config entries (`toBe`, matching the registry tests' stance).
    const result = resolveTonight(new Date("2026-08-11T19:00:00Z"), tuesdays);
    expect(result.kind === "tonight" && result.night).toBe(tuesdays.nights[0]);
  });

  it("accepts unsorted night lists without mutating the input", () => {
    const unsorted: EventNights = {
      timezone: "America/Los_Angeles",
      nights: [night("2026-08-25"), night("2026-08-11"), night("2026-08-18")],
    };
    const result = resolveTonight(new Date("2026-08-12T19:00:00Z"), unsorted);
    expect(result.kind === "upcoming" && result.night.date).toBe("2026-08-18");
    expect(unsorted.nights.map((n) => n.date)).toEqual([
      "2026-08-25",
      "2026-08-11",
      "2026-08-18",
    ]);
  });

  it("skips nights whose date fails calendar validation", () => {
    const withTypo: EventNights = {
      timezone: "America/Los_Angeles",
      nights: [night("2026-08-32"), night("2026-08-18")],
    };
    const result = resolveTonight(new Date("2026-08-06T19:00:00Z"), withTypo);
    expect(result.kind === "upcoming" && result.night.date).toBe("2026-08-18");
  });

  it("resolves an empty night list to season wrap", () => {
    const empty: EventNights = {
      timezone: "America/Los_Angeles",
      nights: [],
    };
    expect(resolveTonight(new Date("2026-08-11T19:00:00Z"), empty)).toEqual({
      kind: "seasonWrap",
    });
  });

  it("throws on an invalid IANA timezone rather than resolving wrongly", () => {
    const badZone: EventNights = {
      timezone: "America/Not_A_Zone",
      nights: [night("2026-08-11")],
    };
    expect(() =>
      resolveTonight(new Date("2026-08-11T19:00:00Z"), badZone),
    ).toThrow(RangeError);
  });
});

describe("formatNightDate", () => {
  it("formats a night date as weekday, full month, and day", () => {
    expect(formatNightDate("2026-08-11")).toBe("Tuesday, August 11");
    expect(formatNightDate("2026-08-18")).toBe("Tuesday, August 18");
    expect(formatNightDate("2026-08-25")).toBe("Tuesday, August 25");
  });

  it("falls back to the raw string for invalid dates", () => {
    expect(formatNightDate("2026-02-30")).toBe("2026-02-30");
    expect(formatNightDate("not-a-date")).toBe("not-a-date");
  });
});

describe("madrona nights content", () => {
  const nights = madronaContent.nights;

  it("registers the three concert Tuesdays in America/Los_Angeles", () => {
    expect(nights?.timezone).toBe("America/Los_Angeles");
    expect(nights?.nights.map((n) => n.date)).toEqual([
      "2026-08-11",
      "2026-08-18",
      "2026-08-25",
    ]);
  });

  it("every night date passes calendar validation", () => {
    for (const n of nights?.nights ?? []) {
      expect(parseEventDate(n.date)).not.toBeNull();
    }
  });

  it("every performerSlug resolves against the lineup", () => {
    const lineupSlugs = new Set(madronaContent.lineup.map((b) => b.slug));
    for (const n of nights?.nights ?? []) {
      expect(lineupSlugs.has(n.performerSlug)).toBe(true);
    }
  });

  it("every night date appears in the multi-day schedule", () => {
    // `nights` supplements `schedule.days`; a night the schedule
    // doesn't know about would mean the two surfaces disagree on
    // when the concerts are.
    const scheduleDates = new Set(
      madronaContent.schedule.days.map((d) => d.date),
    );
    for (const n of nights?.nights ?? []) {
      expect(scheduleDates.has(n.date)).toBe(true);
    }
  });

  it("marks main-set rows and names the band on the first one", () => {
    // Spec rule: main-band rows carry the band's name and get the
    // emphasis treatment. The first flagged row must name the
    // night's performer; resume rows may stay generic.
    const nameBySlug = new Map(
      madronaContent.lineup.map((b) => [b.slug, b.name]),
    );
    for (const n of nights?.nights ?? []) {
      const mainRows = n.runOfShow.filter((row) => row.mainSet);
      expect(mainRows.length).toBeGreaterThan(0);
      expect(mainRows[0].title).toContain(nameBySlug.get(n.performerSlug)!);
    }
  });

  it("has no student opener on Aug 11 and Meter openers on Aug 18/25", () => {
    // Meter Music School's 2026-08-06 email: no students opening
    // night, Tessa Chen on the 18th, Lennon Jennings + Logan Wilcox
    // on the 25th — main sets start at 6:00 / 6:15 / 6:15. Opening
    // night runs true 45-minute sets (organizer decision
    // 2026-08-06): intermission at 6:45, resume at 7:00, closing
    // thanks at 7:45 (music ends 7:45; the event closes by 8:00) —
    // pinned so the "two 45-minute sets" copy stays accurate every
    // night.
    const [opening, mid, closing] = nights?.nights ?? [];
    expect(
      opening.runOfShow.some((row) => row.title.includes("Meter")),
    ).toBe(false);
    expect(opening.runOfShow.find((row) => row.mainSet)?.time).toBe("6:00");
    expect(opening.runOfShow.map((row) => row.time)).toEqual([
      "5:30",
      "6:00",
      "6:45",
      "7:00",
      "7:45",
    ]);

    const midOpener = mid.runOfShow.find((row) => row.title.includes("Meter"));
    expect(midOpener?.time).toBe("6:00");
    expect(midOpener?.description).toContain("Tessa Chen");
    expect(mid.runOfShow.find((row) => row.mainSet)?.time).toBe("6:15");

    const closingOpener = closing.runOfShow.find((row) =>
      row.title.includes("Meter"),
    );
    expect(closingOpener?.time).toBe("6:00");
    expect(closingOpener?.description).toContain("Lennon Jennings");
    expect(closingOpener?.description).toContain("Logan Wilcox");
    expect(closing.runOfShow.find((row) => row.mainSet)?.time).toBe("6:15");
  });

  it("credits the per-night headliner sponsors", () => {
    expect(nights?.nights.map((n) => n.headlinerSponsor?.name)).toEqual([
      "Poppie",
      "Cambium",
      "Zac Lee",
    ]);
    for (const n of nights?.nights ?? []) {
      expect(n.headlinerSponsor?.logoSrc).toMatch(
        /^\/events\/madrona\/sponsors\//,
      );
      expect(n.headlinerSponsor?.logoAlt).toBeTruthy();
    }
  });

  it("test events do not opt in to nights", () => {
    // The omission-guard falsifier stays structural: harvest and
    // riverside render byte-identically to the pre-field output.
    expect(Object.hasOwn(harvestBlockPartyContent, "nights")).toBe(false);
    expect(Object.hasOwn(riversideJamContent, "nights")).toBe(false);
  });
});
