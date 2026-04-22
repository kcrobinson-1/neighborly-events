import { useState } from "react";

export const EMPTY_CODE_SUFFIX = "";

/** Appends one ASCII digit to the suffix buffer, clamping at four digits. */
export function appendCodeSuffixDigit(currentCodeSuffix: string, digit: string) {
  if (!/^\d$/.test(digit) || currentCodeSuffix.length >= 4) {
    return currentCodeSuffix;
  }

  return `${currentCodeSuffix}${digit}`;
}

/** Removes the last digit from the suffix buffer. */
export function removeCodeSuffixDigit(currentCodeSuffix: string) {
  return currentCodeSuffix.slice(0, -1);
}

/** Returns true once the keypad buffer contains exactly four digits. */
export function isCodeSuffixReady(codeSuffix: string) {
  return /^\d{4}$/.test(codeSuffix);
}

function formatCodeSuffixPreview(codeSuffix: string) {
  return codeSuffix.padEnd(4, "•");
}

type UseRedeemKeypadStateOptions = {
  onStartEntry?: () => void;
};

/** Owns the 0-4 digit suffix buffer, clear/backspace transitions, and submit gating. */
export function useRedeemKeypadState(
  options: UseRedeemKeypadStateOptions = {},
) {
  const { onStartEntry } = options;
  const [codeSuffix, setCodeSuffix] = useState(EMPTY_CODE_SUFFIX);

  const enterDigit = (digit: string) => {
    setCodeSuffix((currentCodeSuffix) => {
      const nextCodeSuffix = appendCodeSuffixDigit(currentCodeSuffix, digit);

      if (nextCodeSuffix !== currentCodeSuffix) {
        onStartEntry?.();
      }

      return nextCodeSuffix;
    });
  };

  const backspaceDigit = () => {
    setCodeSuffix(removeCodeSuffixDigit);
  };

  const clearDigits = () => {
    setCodeSuffix(EMPTY_CODE_SUFFIX);
  };

  const reset = () => {
    setCodeSuffix(EMPTY_CODE_SUFFIX);
  };

  return {
    backspaceDigit,
    clearDigits,
    codeSuffix,
    displayCodeSuffix: formatCodeSuffixPreview(codeSuffix),
    enterDigit,
    isSubmitEnabled: isCodeSuffixReady(codeSuffix),
    reset,
  };
}
