import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathnameNavigation } from "../../apps/web/src/usePathnameNavigation";

describe("usePathnameNavigation navigate({ replace })", () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    pushStateSpy = vi.spyOn(window.history, "pushState");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
    scrollToSpy = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
    scrollToSpy.mockRestore();
  });

  it("navigate(path) without options uses pushState and updates pathname state", () => {
    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/admin");
    });

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/admin");
    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(result.current.pathname).toBe("/admin");
  });

  it("navigate(path, { replace: true }) uses replaceState and does not call pushState", () => {
    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/admin", { replace: true });
    });

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/admin");
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(result.current.pathname).toBe("/admin");
  });

  it("navigate(path, { replace: false }) is equivalent to the no-options call", () => {
    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/admin", { replace: false });
    });

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/admin");
    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(result.current.pathname).toBe("/admin");
  });

  it("navigate({ replace: true }) still updates history when the pathname matches the current one", () => {
    window.history.replaceState({}, "", "/admin?next=/admin");

    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/admin", { replace: true });
    });

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(replaceStateSpy.mock.calls.some((call) => call[2] === "/admin")).toBe(
      true,
    );
  });
});
