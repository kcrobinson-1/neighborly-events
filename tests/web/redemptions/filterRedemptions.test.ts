import { describe, expect, it } from "vitest";
import { filterRedemptions } from "../../../apps/web/src/redemptions/filterRedemptions";
import type { RedemptionRow } from "../../../apps/web/src/redemptions/types";

const NOW_MS = Date.parse("2026-04-22T10:30:00Z");

function makeRow(overrides: Partial<RedemptionRow>): RedemptionRow {
  return {
    event_id: "event-1",
    id: "row-1",
    redeemed_at: "2026-04-22T10:25:00Z",
    redeemed_by: "user-a",
    redeemed_by_role: "agent",
    redemption_reversed_at: null,
    redemption_reversed_by: null,
    redemption_reversed_by_role: null,
    redemption_status: "redeemed",
    verification_code: "MAD-0001",
    ...overrides,
  };
}

describe("filterRedemptions", () => {
  it("returns all rows when no chip is active and search is empty", () => {
    const rows = [makeRow({}), makeRow({ id: "row-2" })];

    expect(
      filterRedemptions({
        chips: {
          byMe: false,
          last15m: false,
          redeemed: false,
          reversed: false,
        },
        currentUserId: "user-a",
        nowMs: NOW_MS,
        rows,
        searchResult: { type: "no_filter" },
      }),
    ).toEqual(rows);
  });

  it("Redeemed chip keeps rows whose redemption_status is 'redeemed'", () => {
    const rows = [
      makeRow({ id: "a", redemption_status: "redeemed" }),
      makeRow({
        id: "b",
        redeemed_at: null,
        redeemed_by: null,
        redeemed_by_role: null,
        redemption_reversed_at: "2026-04-22T10:20:00Z",
        redemption_reversed_by: "user-b",
        redemption_reversed_by_role: "organizer",
        redemption_status: "unredeemed",
      }),
    ];

    const result = filterRedemptions({
      chips: {
        byMe: false,
        last15m: false,
        redeemed: true,
        reversed: false,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows,
      searchResult: { type: "no_filter" },
    });

    expect(result.map((row) => row.id)).toEqual(["a"]);
  });

  it("Reversed chip keeps rows whose redemption_reversed_at is not null", () => {
    const rows = [
      makeRow({ id: "a" }),
      makeRow({
        id: "b",
        redemption_reversed_at: "2026-04-22T10:20:00Z",
      }),
    ];

    const result = filterRedemptions({
      chips: {
        byMe: false,
        last15m: false,
        redeemed: false,
        reversed: true,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows,
      searchResult: { type: "no_filter" },
    });

    expect(result.map((row) => row.id)).toEqual(["b"]);
  });

  it("Reversed chip excludes a row whose reversal metadata was cleared by a subsequent redeem", () => {
    const row = makeRow({
      id: "re-redeemed",
      redemption_reversed_at: null,
      redemption_status: "redeemed",
    });

    const result = filterRedemptions({
      chips: {
        byMe: false,
        last15m: false,
        redeemed: false,
        reversed: true,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows: [row],
      searchResult: { type: "no_filter" },
    });

    expect(result).toEqual([]);
  });

  it("By me matches redeemed_by === currentUserId and excludes null", () => {
    const rows = [
      makeRow({ id: "mine", redeemed_by: "user-a" }),
      makeRow({ id: "theirs", redeemed_by: "user-b" }),
      makeRow({
        id: "null-redeemer",
        redeemed_by: null,
        redeemed_by_role: null,
        redeemed_at: null,
        redemption_reversed_at: "2026-04-22T10:20:00Z",
        redemption_reversed_by: "user-a",
        redemption_reversed_by_role: "organizer",
        redemption_status: "unredeemed",
      }),
    ];

    const result = filterRedemptions({
      chips: {
        byMe: true,
        last15m: false,
        redeemed: false,
        reversed: false,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows,
      searchResult: { type: "no_filter" },
    });

    expect(result.map((row) => row.id)).toEqual(["mine"]);
  });

  it("By me returns zero rows when currentUserId is null", () => {
    const rows = [makeRow({ redeemed_by: null })];

    expect(
      filterRedemptions({
        chips: {
          byMe: true,
          last15m: false,
          redeemed: false,
          reversed: false,
        },
        currentUserId: null,
        nowMs: NOW_MS,
        rows,
        searchResult: { type: "no_filter" },
      }),
    ).toEqual([]);
  });

  it("Last 15m keeps rows within 15 minutes; exactly 15 minutes old falls outside", () => {
    const rows = [
      makeRow({ id: "inside", redeemed_at: "2026-04-22T10:20:00Z" }),
      makeRow({ id: "boundary", redeemed_at: "2026-04-22T10:15:00Z" }),
      makeRow({ id: "outside", redeemed_at: "2026-04-22T10:14:00Z" }),
    ];

    const result = filterRedemptions({
      chips: {
        byMe: false,
        last15m: true,
        redeemed: false,
        reversed: false,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows,
      searchResult: { type: "no_filter" },
    });

    expect(result.map((row) => row.id)).toEqual(["inside"]);
  });

  it("combined Redeemed and By me is an AND", () => {
    const rows = [
      makeRow({ id: "mine-redeemed", redeemed_by: "user-a" }),
      makeRow({ id: "mine-reversed", redeemed_by: "user-a", redemption_reversed_at: "2026-04-22T10:25:00Z" }),
      makeRow({ id: "theirs-redeemed", redeemed_by: "user-b" }),
    ];

    const result = filterRedemptions({
      chips: {
        byMe: true,
        last15m: false,
        redeemed: true,
        reversed: false,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows,
      searchResult: { type: "no_filter" },
    });

    expect(result.map((row) => row.id)).toEqual(["mine-redeemed", "mine-reversed"]);
  });

  it("suffix search narrows by verification_code suffix match", () => {
    const rows = [
      makeRow({ id: "match", verification_code: "MAD-0427" }),
      makeRow({ id: "miss", verification_code: "MAD-0428" }),
    ];

    const result = filterRedemptions({
      chips: {
        byMe: false,
        last15m: false,
        redeemed: false,
        reversed: false,
      },
      currentUserId: "user-a",
      nowMs: NOW_MS,
      rows,
      searchResult: { suffix: "0427", type: "suffix_match" },
    });

    expect(result.map((row) => row.id)).toEqual(["match"]);
  });

  it("cross_event_mismatch search returns an empty result regardless of chip state", () => {
    const rows = [makeRow({})];

    expect(
      filterRedemptions({
        chips: {
          byMe: false,
          last15m: false,
          redeemed: true,
          reversed: false,
        },
        currentUserId: "user-a",
        nowMs: NOW_MS,
        rows,
        searchResult: { type: "cross_event_mismatch" },
      }),
    ).toEqual([]);
  });
});
