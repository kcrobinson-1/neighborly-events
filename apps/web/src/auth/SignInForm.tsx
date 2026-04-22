import type { FormEvent } from "react";
import type { MagicLinkState } from "./types";

export type SignInFormCopy = {
  eyebrow: string;
  heading: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailInputId: string;
  submitLabelIdle: string;
  submitLabelPending: string;
};

export type SignInFormProps = {
  copy: SignInFormCopy;
  emailInput: string;
  magicLinkState: MagicLinkState;
  onEmailInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** Role-neutral magic-link request form for signed-out visitors. */
export function SignInForm({
  copy,
  emailInput,
  magicLinkState,
  onEmailInputChange,
  onSubmit,
}: SignInFormProps) {
  return (
    <div className="signin-stack">
      <div className="section-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.heading}</h2>
      </div>
      <form className="signin-form" onSubmit={onSubmit}>
        <label className="signin-field" htmlFor={copy.emailInputId}>
          <span className="signin-field-label">{copy.emailLabel}</span>
          <input
            autoComplete="email"
            className="signin-input"
            id={copy.emailInputId}
            name="email"
            onChange={(event) => onEmailInputChange(event.target.value)}
            placeholder={copy.emailPlaceholder}
            type="email"
            value={emailInput}
          />
        </label>
        <button
          className="primary-button"
          disabled={magicLinkState.status === "pending"}
          type="submit"
        >
          {magicLinkState.status === "pending"
            ? copy.submitLabelPending
            : copy.submitLabelIdle}
        </button>
      </form>
      {magicLinkState.message ? (
        <p
          className={
            magicLinkState.status === "error"
              ? "signin-message signin-message-error"
              : "signin-message signin-message-success"
          }
        >
          {magicLinkState.message}
        </p>
      ) : null}
    </div>
  );
}
