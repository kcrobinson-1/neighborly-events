const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

type RedeemKeypadProps = {
  disabled?: boolean;
  isSubmitEnabled: boolean;
  isSubmitting?: boolean;
  onBackspace: () => void;
  onClear: () => void;
  onDigit: (digit: string) => void;
  onSubmit: () => void;
};

/** Persistent numeric keypad for 4-digit redeem code entry. */
export function RedeemKeypad({
  disabled = false,
  isSubmitEnabled,
  isSubmitting = false,
  onBackspace,
  onClear,
  onDigit,
  onSubmit,
}: RedeemKeypadProps) {
  return (
    <div className="redeem-keypad" role="group" aria-label="Redeem keypad">
      {KEYPAD_ROWS.map((row) => (
        <div className="redeem-keypad-row" key={row.join("-")}>
          {row.map((digit) => (
            <button
              className="redeem-keypad-button"
              disabled={disabled}
              key={digit}
              onClick={() => onDigit(digit)}
              type="button"
            >
              {digit}
            </button>
          ))}
        </div>
      ))}
      <div className="redeem-keypad-row">
        <button
          className="redeem-keypad-button redeem-keypad-button-secondary"
          disabled={disabled}
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
        <button
          className="redeem-keypad-button"
          disabled={disabled}
          onClick={() => onDigit("0")}
          type="button"
        >
          0
        </button>
        <button
          aria-label="Backspace"
          className="redeem-keypad-button redeem-keypad-button-secondary"
          disabled={disabled}
          onClick={onBackspace}
          type="button"
        >
          Backspace
        </button>
      </div>
      <button
        className="primary-button redeem-submit-button"
        disabled={disabled || !isSubmitEnabled || isSubmitting}
        onClick={onSubmit}
        type="button"
      >
        {isSubmitting ? "Redeeming..." : "Redeem code"}
      </button>
    </div>
  );
}
