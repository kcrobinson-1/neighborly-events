import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRedemptionsFilters } from "../../../apps/web/src/redemptions/useRedemptionsFilters";

describe("useRedemptionsFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("snapshots nowMs on mount and starts with empty filter state", () => {
    const { result } = renderHook(() => useRedemptionsFilters());

    expect(result.current.nowMs).toBe(Date.parse("2026-04-22T10:00:00Z"));
    expect(result.current.chips).toEqual({
      byMe: false,
      last15m: false,
      redeemed: false,
      reversed: false,
    });
    expect(result.current.searchInput).toBe("");
  });

  it("advances nowMs on chip toggle", () => {
    const { result } = renderHook(() => useRedemptionsFilters());
    const initialNowMs = result.current.nowMs;

    act(() => {
      vi.setSystemTime(new Date("2026-04-22T10:05:00Z"));
      result.current.toggleChip("last15m");
    });

    expect(result.current.chips.last15m).toBe(true);
    expect(result.current.nowMs).toBeGreaterThan(initialNowMs);
    expect(result.current.nowMs).toBe(Date.parse("2026-04-22T10:05:00Z"));
  });

  it("advances nowMs on every search input change", () => {
    const { result } = renderHook(() => useRedemptionsFilters());

    act(() => {
      vi.setSystemTime(new Date("2026-04-22T10:05:00Z"));
      result.current.setSearchInput("04");
    });

    expect(result.current.searchInput).toBe("04");
    expect(result.current.nowMs).toBe(Date.parse("2026-04-22T10:05:00Z"));

    act(() => {
      vi.setSystemTime(new Date("2026-04-22T10:10:00Z"));
      result.current.setSearchInput("0427");
    });

    expect(result.current.searchInput).toBe("0427");
    expect(result.current.nowMs).toBe(Date.parse("2026-04-22T10:10:00Z"));
  });

  it("advances nowMs when clearing the search input to empty", () => {
    const { result } = renderHook(() => useRedemptionsFilters());

    act(() => {
      result.current.setSearchInput("0427");
    });

    act(() => {
      vi.setSystemTime(new Date("2026-04-22T10:07:00Z"));
      result.current.setSearchInput("");
    });

    expect(result.current.searchInput).toBe("");
    expect(result.current.nowMs).toBe(Date.parse("2026-04-22T10:07:00Z"));
  });

  it("advances nowMs when refreshNowMs is called", () => {
    const { result } = renderHook(() => useRedemptionsFilters());

    act(() => {
      vi.setSystemTime(new Date("2026-04-22T10:12:00Z"));
      result.current.refreshNowMs();
    });

    expect(result.current.nowMs).toBe(Date.parse("2026-04-22T10:12:00Z"));
  });

  it("does not advance nowMs on re-renders that do not change filter state", () => {
    const { rerender, result } = renderHook(() => useRedemptionsFilters());
    const initialNowMs = result.current.nowMs;

    vi.setSystemTime(new Date("2026-04-22T10:20:00Z"));
    rerender();

    expect(result.current.nowMs).toBe(initialNowMs);
  });
});
