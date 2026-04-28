import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  documentNavigation,
  usePathnameNavigation,
} from "../../apps/web/src/usePathnameNavigation";

describe("usePathnameNavigation navigate({ replace })", () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let documentAssignSpy: ReturnType<typeof vi.spyOn>;
  let documentReplaceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    pushStateSpy = vi.spyOn(window.history, "pushState");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
    scrollToSpy = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    documentAssignSpy = vi
      .spyOn(documentNavigation, "assign")
      .mockImplementation(() => undefined);
    documentReplaceSpy = vi
      .spyOn(documentNavigation, "replace")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
    scrollToSpy.mockRestore();
    documentAssignSpy.mockRestore();
    documentReplaceSpy.mockRestore();
  });

  it("navigate(path) without options uses pushState and updates pathname state", () => {
    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/admin");
    });

    expect(documentAssignSpy).not.toHaveBeenCalled();
    expect(documentReplaceSpy).not.toHaveBeenCalled();
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
    expect(documentAssignSpy).not.toHaveBeenCalled();
    expect(documentReplaceSpy).not.toHaveBeenCalled();
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
    expect(documentAssignSpy).not.toHaveBeenCalled();
    expect(documentReplaceSpy).not.toHaveBeenCalled();
    expect(result.current.pathname).toBe("/admin");
  });

  it("navigate({ replace: true }) still updates history when the pathname matches the current one", () => {
    window.history.replaceState({}, "", "/admin?next=/admin");

    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/admin", { replace: true });
    });

    expect(replaceStateSpy).toHaveBeenCalled();
    expect(documentAssignSpy).not.toHaveBeenCalled();
    expect(documentReplaceSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy.mock.calls.some((call) => call[2] === "/admin")).toBe(
      true,
    );
  });

  it("navigate('/') leaves the SPA with document-level navigation", () => {
    window.history.replaceState({}, "", "/admin");

    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/");
    });

    expect(documentAssignSpy).toHaveBeenCalledWith("/");
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalledWith({}, "", "/");
    expect(result.current.pathname).toBe("/admin");
  });

  it("navigate('/', { replace: true }) uses document-level replace navigation", () => {
    window.history.replaceState({}, "", "/admin");

    const { result } = renderHook(() => usePathnameNavigation());

    act(() => {
      result.current.navigate("/", { replace: true });
    });

    expect(documentReplaceSpy).toHaveBeenCalledWith("/");
    expect(documentAssignSpy).not.toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalledWith({}, "", "/");
  });
});
