"use client";

import { useMemo, useState } from "react";

import type { EventContent } from "../../../../lib/eventContent.ts";
import { getBrowserSupabaseClient } from "../../../../lib/supabaseBrowser.ts";

type FeedbackContent = NonNullable<EventContent["feedback"]>;

type RatingValue = number | "n/a";
type RatingsState = Record<string, RatingValue | undefined>;

type FormState =
  | { tag: "idle" }
  | { tag: "submitting" }
  | { tag: "success" }
  | { tag: "error" };

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

// Decision 6: presence of `@`, at least one non-whitespace non-`@`
// character on each side, and at least one `.` in the domain segment
// with at least one non-whitespace non-`@` character on each side.
// Intentionally minimal — the rule is "structurally email-shaped,"
// not RFC 5322 conformance. Attendees with edge-case addresses can
// decline and submit without email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Attendee feedback form. Client component (`'use client'`) because
 * it owns local input state, runs client-side validation guards, and
 * issues the anon Supabase insert directly from the browser per
 * scoping Decision 2 — no Server Action, no Edge Function in M1.
 *
 * Four-state machine: `idle` (filling) → `submitting` (insert in
 * flight, all inputs disabled) → `success` (thank-you replaces the
 * form in place) or `error` (inline error, fields preserved, retry
 * re-enters `submitting`). No `success → idle` transition; the
 * milestone-invariant landing-state is "thank-you replaces form
 * in-place; no redirect."
 *
 * Rating-dimension keys are content-authored (epic Invariant 3); the
 * form iterates over `feedback.ratingDimensions` and emits the `key`
 * strings verbatim into the `ratings` jsonb. Decline-as-first-class
 * (epic Invariant 4) hides the email row and the newsletter row;
 * newsletter is opt-in not opt-out (epic Invariant 5) so the
 * checkbox defaults unchecked and is structurally unreachable when
 * email is blank or decline is checked.
 */
export function FeedbackForm({
  feedback,
  slug,
}: {
  feedback: FeedbackContent;
  slug: string;
}) {
  const [ratings, setRatings] = useState<RatingsState>({});
  const [freeText, setFreeText] = useState("");
  const [emailDeclined, setEmailDeclined] = useState(false);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({ tag: "idle" });

  const trimmedEmail = email.trim();
  const newsletterReachable = !emailDeclined && trimmedEmail.length > 0;
  const isSubmitting = state.tag === "submitting";

  const dimensions = useMemo(
    () => feedback.ratingDimensions,
    [feedback.ratingDimensions],
  );

  if (state.tag === "success") {
    return (
      <main className="event-feedback-form-shell">
        <p className="event-feedback-form-thanks" role="status">
          {feedback.thankYouMessage}
        </p>
      </main>
    );
  }

  function setRating(key: string, value: RatingValue) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  function handleDeclineToggle(checked: boolean) {
    setEmailDeclined(checked);
    if (checked) {
      setNewsletter(false);
      setEmailError(null);
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (value.trim().length === 0) {
      setNewsletter(false);
    }
    if (emailError) {
      setEmailError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const free = freeText.trim();
    const freeTextOut = free.length === 0 ? null : free;

    let emailOut: string | null;
    let emailDeclinedOut: boolean;
    let newsletterOut: boolean;

    if (emailDeclined) {
      emailOut = null;
      emailDeclinedOut = true;
      newsletterOut = false;
    } else if (trimmedEmail.length === 0) {
      emailOut = null;
      emailDeclinedOut = false;
      newsletterOut = false;
    } else {
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        setEmailError("Enter an email like name@example.com, or check decline.");
        return;
      }
      emailOut = trimmedEmail;
      emailDeclinedOut = false;
      newsletterOut = newsletter;
    }

    const ratingsOut: Record<string, RatingValue> = {};
    for (const dim of dimensions) {
      const value = ratings[dim.key];
      if (value !== undefined) {
        ratingsOut[dim.key] = value;
      }
    }

    setState({ tag: "submitting" });
    try {
      const client = getBrowserSupabaseClient();
      const { error } = await client.from("feedback_submissions").insert({
        event_slug: slug,
        ratings: ratingsOut,
        free_text: freeTextOut,
        email: emailOut,
        email_declined: emailDeclinedOut,
        newsletter_opt_in: newsletterOut,
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
    <main className="event-feedback-form-shell">
      <h1 className="event-section-heading">{feedback.cta.heading}</h1>
      {feedback.cta.body ? (
        <p className="event-feedback-form-intro">{feedback.cta.body}</p>
      ) : null}
      <form className="event-feedback-form" noValidate onSubmit={handleSubmit}>
        <fieldset
          className="event-feedback-form-ratings"
          disabled={isSubmitting}
        >
          <legend className="event-feedback-form-legend">Ratings</legend>
          {dimensions.map((dim) => {
            const value = ratings[dim.key];
            const isNa = value === "n/a";
            return (
              <div
                key={dim.key}
                className="event-feedback-form-rating-row"
                role="group"
                aria-label={dim.label}
              >
                <span className="event-feedback-form-rating-label">
                  {dim.label}
                </span>
                <div className="event-feedback-form-rating-buttons">
                  {STAR_VALUES.map((star) => {
                    const selected = value === star;
                    const numericValue = typeof value === "number" ? value : 0;
                    const filled = star <= numericValue;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="event-feedback-form-rating-button"
                        data-filled={filled ? "true" : undefined}
                        aria-pressed={selected}
                        aria-label={`${dim.label}: ${star} of 5`}
                        onClick={() => setRating(dim.key, star)}
                      >
                        <span aria-hidden="true">★</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="event-feedback-form-na-button"
                    aria-pressed={isNa}
                    onClick={() => setRating(dim.key, "n/a")}
                  >
                    N/A
                  </button>
                </div>
              </div>
            );
          })}
        </fieldset>

        <label className="event-feedback-form-textarea-label">
          <span>{feedback.freeTextPrompt}</span>
          <textarea
            className="event-feedback-form-textarea"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </label>

        <label className="event-feedback-form-decline">
          <input
            type="checkbox"
            checked={emailDeclined}
            onChange={(e) => handleDeclineToggle(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>{feedback.emailCopy.declineLabel}</span>
        </label>

        {!emailDeclined ? (
          <label className="event-feedback-form-email">
            <span>{feedback.emailCopy.label}</span>
            <input
              type="email"
              className="event-feedback-form-email-input"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={isSubmitting}
              inputMode="email"
              autoComplete="email"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={
                emailError ? "event-feedback-form-email-error" : undefined
              }
            />
            {emailError ? (
              <span
                id="event-feedback-form-email-error"
                className="event-feedback-form-email-error"
                role="alert"
              >
                {emailError}
              </span>
            ) : null}
          </label>
        ) : null}

        {newsletterReachable ? (
          <label className="event-feedback-form-newsletter">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>{feedback.emailCopy.newsletterOptInLabel}</span>
          </label>
        ) : null}

        {state.tag === "error" ? (
          <p className="event-feedback-form-error" role="alert">
            Couldn&apos;t submit your feedback. Please try again.
          </p>
        ) : null}

        <button
          type="submit"
          className="event-feedback-form-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Submit feedback"}
        </button>
      </form>
    </main>
  );
}
