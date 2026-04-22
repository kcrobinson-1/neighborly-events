import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRedeemKeypadState } from "../../../apps/web/src/redeem/useRedeemKeypadState.ts";

function KeypadStateHarness({
  onStartEntry = vi.fn(),
}: {
  onStartEntry?: () => void;
}) {
  const keypadState = useRedeemKeypadState({ onStartEntry });

  return (
    <div>
      <output aria-label="code">{keypadState.codeSuffix}</output>
      <output aria-label="preview">{keypadState.displayCodeSuffix}</output>
      <output aria-label="submit-ready">
        {keypadState.isSubmitEnabled ? "ready" : "not-ready"}
      </output>
      <button onClick={() => keypadState.enterDigit("1")} type="button">
        Digit 1
      </button>
      <button onClick={() => keypadState.enterDigit("2")} type="button">
        Digit 2
      </button>
      <button onClick={() => keypadState.enterDigit("3")} type="button">
        Digit 3
      </button>
      <button onClick={() => keypadState.enterDigit("4")} type="button">
        Digit 4
      </button>
      <button onClick={() => keypadState.enterDigit("5")} type="button">
        Digit 5
      </button>
      <button onClick={keypadState.backspaceDigit} type="button">
        Backspace
      </button>
      <button onClick={keypadState.clearDigits} type="button">
        Clear
      </button>
      <button onClick={keypadState.reset} type="button">
        Reset
      </button>
    </div>
  );
}

describe("useRedeemKeypadState", () => {
  afterEach(() => {
    cleanup();
  });

  it("appends digits until the suffix reaches four digits", () => {
    render(<KeypadStateHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Digit 1" }));
    expect(screen.getByLabelText("code").textContent).toBe("1");
    expect(screen.getByLabelText("preview").textContent).toBe("1•••");
    expect(screen.getByLabelText("submit-ready").textContent).toBe("not-ready");

    fireEvent.click(screen.getByRole("button", { name: "Digit 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 4" }));

    expect(screen.getByLabelText("code").textContent).toBe("1234");
    expect(screen.getByLabelText("submit-ready").textContent).toBe("ready");
  });

  it("ignores extra digits after the suffix reaches four digits", () => {
    render(<KeypadStateHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Digit 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 5" }));

    expect(screen.getByLabelText("code").textContent).toBe("1234");
  });

  it("backspaces one digit at a time and no-ops from empty", () => {
    render(<KeypadStateHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Backspace" }));
    expect(screen.getByLabelText("code").textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Digit 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Backspace" }));

    expect(screen.getByLabelText("code").textContent).toBe("1");
  });

  it("clears and resets the suffix buffer", () => {
    render(<KeypadStateHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Digit 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("code").textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Digit 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("code").textContent).toBe("");
  });

  it("calls onStartEntry when a new digit is accepted", () => {
    const onStartEntry = vi.fn();

    render(<KeypadStateHarness onStartEntry={onStartEntry} />);

    fireEvent.click(screen.getByRole("button", { name: "Digit 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Digit 2" }));

    expect(onStartEntry).toHaveBeenCalledTimes(2);
  });
});
