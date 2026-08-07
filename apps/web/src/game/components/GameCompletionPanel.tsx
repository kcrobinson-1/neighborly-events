/** Completion-state panel for verification, retries, retakes, and answer review. */
import type {
  CompletionCtaContent,
  CompletionCtaLink,
} from "../../../../../shared/events/completionCta";
import { answersMatch } from "../../../../../shared/game-config";
import type { AttendeeRedemptionStatus } from "../../../../../shared/redemption";
import type { GameConfig } from "../../data/games";
import { getOptionLabels } from "../gameUtils";
import type { Answers, GameCompletionResult } from "../../types/game";

function getChipText(
  status: AttendeeRedemptionStatus["kind"],
  isEntitlementNew: boolean,
) {
  if (status === "unknown") {
    return isEntitlementNew ? "Reward entry ready" : "Already checked in";
  }

  return status === "redeemed"
    ? "Volunteer check-in complete"
    : "Ready for volunteer check-in";
}

function getHeadline(status: AttendeeRedemptionStatus["kind"]) {
  return status === "redeemed"
    ? "Your volunteer check-in is complete"
    : "Show this screen at the volunteer table";
}

function getBodyCopy(
  status: AttendeeRedemptionStatus["kind"],
  isEntitlementNew: boolean,
) {
  if (status === "unknown") {
    return isEntitlementNew
      ? "You're checked in for the reward."
      : "You're still checked in for the reward. Playing again does not add another reward entry.";
  }

  return status === "redeemed"
    ? "A volunteer has redeemed this code. You're all set."
    : "Your reward entry is ready. Show this screen and code to the volunteer.";
}

/** Props for the game completion screen. */
type GameCompletionPanelProps = {
  answers: Answers;
  completion: GameCompletionResult | null;
  completionError: string | null;
  cta: CompletionCtaContent | null;
  game: GameConfig;
  /**
   * True when the completed state is confirmed written to device storage.
   * While false, the in-memory state is the only copy of the verification
   * code, so same-origin CTA links keep the pre-persistence new-tab
   * fallback. Links their content declares external open in a new context
   * either way — see `ctaLinkAttrs` below.
   */
  isCompletionPersisted: boolean;
  isSubmitting: boolean;
  onReset: () => void;
  onRetake: () => void;
  onRetrySubmission: () => void;
  score: number;
  showRetake: boolean;
  status: AttendeeRedemptionStatus;
};

/** Completion screen that shows verification and optional answer review. */
export function GameCompletionPanel({
  answers,
  completion,
  completionError,
  cta,
  game,
  isCompletionPersisted,
  isSubmitting,
  onReset,
  onRetake,
  onRetrySubmission,
  score,
  showRetake,
  status,
}: GameCompletionPanelProps) {
  const isEntitlementNew = completion?.entitlement.status === "new";
  const verificationCode = completion?.entitlement.verificationCode ?? null;
  const shouldShowVerification = isSubmitting || Boolean(completion);
  const shouldShowAnswerReview =
    Boolean(completion) && game.feedbackMode === "final_score_reveal";
  const completionChipText = getChipText(status.kind, Boolean(isEntitlementNew));
  const completionHeadline = getHeadline(status.kind);
  const completionMessage = getBodyCopy(status.kind, Boolean(isEntitlementNew));
  // The CTA rides on the entitlement but never blocks it: it renders only
  // once the completion result exists, below the verification block, and
  // only for events registered in the completion CTA registry.
  // Every optional section is named here. The gate listed only two
  // while the content shape carried a third, an event authoring just
  // that one would render nothing at all — so a section added above
  // has to be added here in the same change.
  const shouldShowCta =
    Boolean(completion) &&
    Boolean(cta?.emailList ?? cta?.donate ?? cta?.volunteer);
  // Two independent reasons a CTA link opens in a new browsing context, and
  // they do not substitute for one another:
  //
  //   1. The link is external by its own content (`CompletionCtaLink.external`).
  //      It leaves the platform, so it always opens in a new context —
  //      including once the completed state is durable.
  //   2. The completed state is not yet confirmed persisted on the device
  //      (privacy mode, quota). The in-memory state is then the only copy of
  //      the verification code, so a same-tab navigation could destroy it.
  //      This reason is about *this* app's state, so it applies to the
  //      same-origin links whose navigation could leave the app — an external
  //      link is already covered by (1).
  //
  // A same-origin link therefore keeps exactly the pre-existing
  // persistence-derived behavior.
  const ctaLinkAttrs = (link: CompletionCtaLink) =>
    link.external || !isCompletionPersisted
      ? { target: "_blank" as const, rel: "noopener" }
      : { target: undefined, rel: undefined };

  return (
    <section className="panel completion-panel">
      <span
        className={`chip${
          completion
            ? status.kind === "redeemed"
              ? " chip-success"
              : ""
            : completionError
              ? " chip-error"
              : ""
        }`}
      >
        {completion
          ? completionChipText
          : isSubmitting
            ? "Generating proof"
            : "Try again"}
      </span>
      <h2>
        {completion
          ? completionHeadline
          : isSubmitting
            ? "Generating your check-in code"
            : "We couldn't load your check-in code"}
      </h2>
      <p>
        {completion
          ? completionMessage
          : isSubmitting
            ? "Keep this screen open while we save your completion and create the volunteer check-in code."
            : completionError ??
              "Try again to finish your reward check-in."}
      </p>

      {shouldShowAnswerReview ? (
        <div className="results-block">
          <div className="score-card">
            <span className="token-label">Final score</span>
            <strong>
              {score} / {game.questions.length}
            </strong>
          </div>
          <div className="answer-review-list">
            {game.questions.map((question) => {
              const selectedAnswerIds = answers[question.id] ?? [];
              const selectedLabels = getOptionLabels(question, selectedAnswerIds);
              const correctLabels = getOptionLabels(
                question,
                question.correctAnswerIds,
              );
              const isCorrect = answersMatch(
                selectedAnswerIds,
                question.correctAnswerIds,
              );

              return (
                <article className="answer-review-card" key={question.id}>
                  {question.sponsor ? (
                    <p className="sponsor-label">Sponsored by {question.sponsor}</p>
                  ) : null}
                  <h3>{question.prompt}</h3>
                  <p>
                    <strong>Your answer:</strong>{" "}
                    {selectedLabels.length > 0
                      ? selectedLabels.join(", ")
                      : "No answer recorded"}
                  </p>
                  <p>
                    <strong>Correct answer:</strong> {correctLabels.join(", ")}
                  </p>
                  <p
                    className={
                      isCorrect
                        ? "review-status review-status-correct"
                        : "review-status review-status-incorrect"
                    }
                  >
                    {isCorrect ? "Correct" : "Not correct"}
                  </p>
                  {question.sponsorFact ?? question.explanation ? (
                    <p className="answer-review-note">
                      {question.sponsorFact ?? question.explanation}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {shouldShowVerification ? (
        <div
          aria-busy={isSubmitting}
          className={`token-block${isSubmitting ? " token-block-pending" : ""}`}
          role="status"
        >
          <div className="token-status">
            {isSubmitting ? <span aria-hidden="true" className="token-spinner" /> : null}
            <span className="token-label">Check-in code</span>
          </div>
          <strong>{verificationCode ?? "Loading..."}</strong>
          <p className="token-instruction">
            {completion
              ? "Show this code to the volunteer to check in."
              : "Please wait here. The volunteer code will appear in this spot as soon as check-in is complete."}
          </p>
          <span className="token-meta">
            {completion
              ? isEntitlementNew
                ? "Your reward entry is now recorded."
                : "Your earlier reward entry still counts. This replay does not add another one."
              : "This usually takes just a moment, even on slower service."}
          </span>
        </div>
      ) : null}

      {shouldShowCta && cta ? (
        <aside className="completion-cta" aria-labelledby="completion-cta-heading">
          <h3 id="completion-cta-heading">{cta.heading}</h3>
          {cta.emailList ? (
            <div className="completion-cta-item">
              <p>{cta.emailList.body}</p>
              {/* Plain anchor: a same-origin destination here is owned by
                  apps/site, so the navigation must be a hard load for the
                  proxy to re-evaluate. The destination is config-owned —
                  never derived from the game slug, which may not name the
                  event the CTA points at. New-tab behavior comes from
                  `ctaLinkAttrs` above, which reads the link's own
                  `external` declaration and the device-persistence state. */}
              <a
                className="completion-cta-button"
                href={cta.emailList.href}
                {...ctaLinkAttrs(cta.emailList)}
              >
                {cta.emailList.buttonLabel}
              </a>
            </div>
          ) : null}
          {cta.donate ? (
            <div className="completion-cta-item">
              <p>{cta.donate.body}</p>
              {/* Warm CTA variant: renders identically to the base
                  CTA on the token defaults; themes may style the
                  donate action separately via `--cta-warm-*`. */}
              <a
                className="completion-cta-button completion-cta-button-warm"
                href={cta.donate.href}
                {...ctaLinkAttrs(cta.donate)}
              >
                {cta.donate.buttonLabel}
              </a>
            </div>
          ) : null}
          {cta.volunteer ? (
            <div className="completion-cta-item">
              <p>{cta.volunteer.body}</p>
              <a
                className="completion-cta-button"
                href={cta.volunteer.href}
                {...ctaLinkAttrs(cta.volunteer)}
              >
                {cta.volunteer.buttonLabel}
              </a>
            </div>
          ) : null}
        </aside>
      ) : null}

      {!isSubmitting ? (
        <div className="completion-actions">
          {completionError ? (
            <button
              className="primary-button"
              onClick={onRetrySubmission}
              type="button"
            >
              Try again
            </button>
          ) : null}
          {completion && showRetake ? (
            <button className="secondary-button" onClick={onRetake} type="button">
              Retake the quiz
            </button>
          ) : null}
          {/* The completed state is durable (persisted on the device), so its
              only exit is an explicit retake. "Start over" remains solely for
              the failed-submission state, where local answers are all we have. */}
          {!completion ? (
            <button className="secondary-button" onClick={onReset} type="button">
              Start over
            </button>
          ) : null}
        </div>
      ) : null}
      {!isSubmitting && completion && showRetake ? (
        <p className="completion-retake-note">
          Retaking never changes your code or your reward entry.
        </p>
      ) : null}
    </section>
  );
}
