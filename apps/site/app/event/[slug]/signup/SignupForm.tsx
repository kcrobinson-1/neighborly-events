"use client";

import { useState } from "react";

import { EMAIL_PATTERN } from "../../../../lib/emailPattern.ts";
import type { EventContent } from "../../../../lib/eventContent.ts";
import { getBrowserSupabaseClient } from "../../../../lib/supabaseBrowser.ts";

type SignupContent = NonNullable<EventContent["newsletterSignup"]>;

type FormState =
  | { tag: "idle" }
  | { tag: "submitting" }
  | { tag: "success" }
  | { tag: "error" };

/**
 * Standalone newsletter-signup form: one required email field.
 * Unlike the feedback form's optional email (blank = decline), a
 * blank submission here is a validation error — the surface exists
 * only to capture an address. Submitting an already-captured email
 * again succeeds (the RPC appends another consent event; the DB has
 * no uniqueness to trip), so the attendee-visible behavior is
 * idempotent.
 */
export function SignupForm({
  signup,
  slug,
}: {
  signup: SignupContent;
  slug: string;
}) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({ tag: "idle" });

  const isSubmitting = state.tag === "submitting";

  if (state.tag === "success") {
    return (
      <main className="event-signup-form-shell">
        <p className="event-signup-form-thanks" role="status">
          {signup.thankYouMessage}
        </p>
      </main>
    );
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (emailError) {
      setEmailError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter an email like name@example.com.");
      return;
    }

    setState({ tag: "submitting" });
    try {
      const client = getBrowserSupabaseClient();
      // SECURITY DEFINER RPC; anon has execute. Returns void so no row
      // reads back — the same writes-only posture as submit_feedback.
      const { error } = await client.rpc("submit_newsletter_signup", {
        p_event_slug: slug,
        p_email: trimmedEmail,
      });
      if (error) {
        setState({ tag: "error" });
        return;
      }
      setState({ tag: "success" });
    } catch {
      setState({ tag: "error" });
    }
  }

  return (
    <main className="event-signup-form-shell">
      <h1 className="event-section-heading">{signup.heading}</h1>
      {signup.body ? (
        <p className="event-signup-form-intro">{signup.body}</p>
      ) : null}
      <form className="event-signup-form" noValidate onSubmit={handleSubmit}>
        <label className="event-signup-form-email">
          <span>{signup.emailLabel}</span>
          <input
            type="email"
            className="event-signup-form-email-input"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled={isSubmitting}
            required
            inputMode="email"
            autoComplete="email"
            placeholder={signup.emailPlaceholder}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={
              emailError ? "event-signup-form-email-error" : undefined
            }
          />
          {emailError ? (
            <span
              id="event-signup-form-email-error"
              className="event-signup-form-email-error"
              role="alert"
            >
              {emailError}
            </span>
          ) : null}
        </label>

        {state.tag === "error" ? (
          <p className="event-signup-form-error" role="alert">
            Couldn&apos;t sign you up. Please try again.
          </p>
        ) : null}

        <button
          type="submit"
          className="event-signup-form-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing up…" : signup.submitLabel}
        </button>
      </form>
    </main>
  );
}
