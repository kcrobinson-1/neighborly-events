import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompletionCtaContent } from "../../../../shared/events/completionCta.ts";
import type { AttendeeRedemptionStatus } from "../../../../shared/redemption.ts";
import { GameCompletionPanel } from "../../../../apps/web/src/game/components/GameCompletionPanel.tsx";
import type { GameConfig } from "../../../../apps/web/src/data/games.ts";
import type { GameCompletionResult } from "../../../../apps/web/src/types/game.ts";

function createGame(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    id: "test-game",
    slug: "test-game",
    name: "Test Game",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode: "final_score_reveal",
    questions: [
      {
        id: "q1",
        sponsor: "Sponsor One",
        prompt: "Question one?",
        selectionMode: "single",
        correctAnswerIds: ["b"],
        explanation: "Sponsor note one.",
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
    ],
    ...overrides,
  };
}

function createCompletionResult(
  overrides: Partial<GameCompletionResult> = {},
): GameCompletionResult {
  return {
    attemptNumber: 1,
    completionId: "cmp-123",
    entitlement: {
      createdAt: "2026-04-05T12:00:00.000Z",
      status: "new",
      verificationCode: "MMP-1234ABCD",
    },
    message: "You're checked in for the reward.",
    entitlementEligible: true,
    score: 1,
    ...overrides,
  };
}

/**
 * The two link kinds the panel treats differently. A link that is
 * external by its own content always opens in a new browsing context;
 * a same-origin link opens in one only while the completed state is
 * not yet durable on the device. Both kinds are fixtures here rather
 * than reads of the live registry: the panel's contract is about link
 * *kind*, and every entry in the registry happens to be external
 * today, which would leave the same-origin branch untested.
 */
const EXTERNAL_CTA_LINK = {
  body: "Next week's lineup and neighborhood news, straight from the association.",
  buttonLabel: "Join the email list",
  href: "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email",
  external: true,
};

const SAME_ORIGIN_CTA_LINK = {
  body: "Tell the organizer how tonight went.",
  buttonLabel: "Share feedback",
  href: "/event/madrona/feedback",
};

function createCta(
  overrides: Partial<CompletionCtaContent> = {},
): CompletionCtaContent {
  return {
    heading: "Enjoying Music in the Playfield?",
    emailList: EXTERNAL_CTA_LINK,
    donate: {
      body:
        "These concerts are free because neighbors chip in — 100% of donations go to the association.",
      buttonLabel: "Support the Playfield",
      href: "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
    },
    volunteer: {
      body:
        "These concerts run on volunteers — and so does everything else the association does. We can always use another set of hands.",
      buttonLabel: "Volunteer",
      href: "https://madrona.us/volunteers/",
      external: true,
    },
    ...overrides,
  };
}

function createStatus(
  kind: AttendeeRedemptionStatus["kind"],
  verificationCode = "MMP-1234ABCD",
): AttendeeRedemptionStatus {
  return kind === "unknown"
    ? { kind }
    : { kind, verificationCode };
}

describe("GameCompletionPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      completion: createCompletionResult(),
      expectedMeta: "Your reward entry is now recorded.",
      expectedStatusKind: "unknown" as const,
    },
    {
      completion: createCompletionResult({
        entitlement: {
          createdAt: "2026-04-05T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
      }),
      expectedMeta:
        "Your earlier reward entry still counts. This replay does not add another one.",
      expectedStatusKind: "unknown" as const,
    },
    {
      completion: createCompletionResult(),
      expectedMeta: "Your reward entry is now recorded.",
      expectedStatusKind: "unredeemed" as const,
    },
    {
      completion: createCompletionResult({
        entitlement: {
          createdAt: "2026-04-05T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
      }),
      expectedMeta:
        "Your earlier reward entry still counts. This replay does not add another one.",
      expectedStatusKind: "unredeemed" as const,
    },
    {
      completion: createCompletionResult(),
      expectedMeta: "Your reward entry is now recorded.",
      expectedStatusKind: "redeemed" as const,
    },
    {
      completion: createCompletionResult({
        entitlement: {
          createdAt: "2026-04-05T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
      }),
      expectedMeta:
        "Your earlier reward entry still counts. This replay does not add another one.",
      expectedStatusKind: "redeemed" as const,
    },
  ])(
    "renders the copy axes for $expectedStatusKind + $completion.entitlement.status",
    ({ completion, expectedMeta, expectedStatusKind }) => {
      render(
        <GameCompletionPanel
          answers={{ q1: ["a"] }}
          completion={completion}
          completionError={null}
          cta={null}
          game={createGame()}
          isCompletionPersisted={true}
          isSubmitting={false}
          onReset={() => {}}
          onRetake={() => {}}
          onRetrySubmission={() => {}}
          score={1}
          showRetake={true}
          status={createStatus(expectedStatusKind)}
        />,
      );

      expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
      expect(screen.getByText("Final score")).toBeTruthy();
      expect(screen.getByText("Your answer:", { exact: false })).toBeTruthy();
      expect(screen.getByText("Correct answer:", { exact: false })).toBeTruthy();
      expect(screen.getByText(expectedMeta)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Retake the quiz" })).toBeTruthy();
      expect(
        screen.getByText("Retaking never changes your code or your reward entry."),
      ).toBeTruthy();
      // The completed state is durable (persisted on-device), so the retake
      // action is its only exit; "Start over" belongs to the failure state.
      expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();

      if (expectedStatusKind === "redeemed") {
        expect(screen.getByText("Volunteer check-in complete")).toBeTruthy();
        expect(
          screen.getByRole("heading", { name: "Your volunteer check-in is complete" }),
        ).toBeTruthy();
        expect(
          screen.getByText("A volunteer has redeemed this code. You're all set."),
        ).toBeTruthy();
      } else if (expectedStatusKind === "unredeemed") {
        expect(screen.getByText("Ready for volunteer check-in")).toBeTruthy();
        expect(
          screen.getByRole("heading", {
            name: "Show this screen at the volunteer table",
          }),
        ).toBeTruthy();
        expect(
          screen.getByText(
            "Your reward entry is ready. Show this screen and code to the volunteer.",
          ),
        ).toBeTruthy();
      } else {
        expect(
          screen.getByRole("heading", {
            name: "Show this screen at the volunteer table",
          }),
        ).toBeTruthy();

        if (completion.entitlement.status === "new") {
          expect(screen.getByText("Reward entry ready")).toBeTruthy();
          expect(screen.getByText("You're checked in for the reward.")).toBeTruthy();
        } else {
          expect(screen.getByText("Already checked in")).toBeTruthy();
          expect(
            screen.getByText(
              "You're still checked in for the reward. Playing again does not add another reward entry.",
            ),
          ).toBeTruthy();
        }
      }
    },
  );

  it("keeps the verification code block mounted while redemption status changes", () => {
    const { container, rerender } = render(
      <GameCompletionPanel
        answers={{ q1: ["a"] }}
        completion={createCompletionResult()}
        completionError={null}
        cta={null}
        game={createGame()}
        isCompletionPersisted={true}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("unredeemed")}
      />,
    );

    const originalTokenBlock = container.querySelector(".token-block");
    expect(originalTokenBlock).not.toBeNull();

    rerender(
      <GameCompletionPanel
        answers={{ q1: ["a"] }}
        completion={createCompletionResult()}
        completionError={null}
        cta={null}
        game={createGame()}
        isCompletionPersisted={true}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("redeemed")}
      />,
    );

    expect(container.querySelector(".token-block")).toBe(originalTokenBlock);
    expect(screen.getByText("Volunteer check-in complete")).toBeTruthy();
    expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
  });

  it("renders a reviewed question's sources beneath its note", () => {
    render(
      <GameCompletionPanel
        answers={{ q1: ["a"] }}
        completion={createCompletionResult()}
        completionError={null}
        cta={null}
        game={createGame({
          questions: [
            {
              ...createGame().questions[0],
              explanation: "The sculpture was installed in 1974.",
              sources: ["[Seattle Municipal Archives](https://example.org/record)"],
            },
          ],
        })}
        isCompletionPersisted={true}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("unredeemed")}
      />,
    );

    const note = screen.getByText("The sculpture was installed in 1974.");
    const list = screen.getByRole("list", { name: "Sources" });
    expect(
      screen.getByRole("link", { name: "Seattle Municipal Archives" }),
    ).toBeTruthy();
    expect(
      note.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hides the answer-review block in non-blocking mode because reveals were shown during play", () => {
    render(
      <GameCompletionPanel
        answers={{ q1: ["a"] }}
        completion={createCompletionResult()}
        completionError={null}
        cta={null}
        game={createGame({ feedbackMode: "instant_feedback_non_blocking" })}
        isCompletionPersisted={true}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("unredeemed")}
      />,
    );

    // Verification block must still render; the answer-review block must not.
    expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
    expect(screen.queryByText("Final score")).toBeNull();
    expect(screen.queryByText("Your answer:", { exact: false })).toBeNull();
    expect(screen.queryByText("Correct answer:", { exact: false })).toBeNull();
  });

  it("hides the answer-review block in instant-feedback-required mode for the same reason", () => {
    render(
      <GameCompletionPanel
        answers={{ q1: ["b"] }}
        completion={createCompletionResult()}
        completionError={null}
        cta={null}
        game={createGame({ feedbackMode: "instant_feedback_required" })}
        isCompletionPersisted={true}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("unredeemed")}
      />,
    );

    expect(screen.queryByText("Final score")).toBeNull();
  });

  describe("block ordering", () => {
    it("renders the results block above the check-in code when review is enabled", () => {
      const { container } = render(
        <GameCompletionPanel
          answers={{ q1: ["a"] }}
          completion={createCompletionResult()}
          completionError={null}
          cta={createCta()}
          game={createGame()}
          isCompletionPersisted={true}
          isSubmitting={false}
          onReset={() => {}}
          onRetake={() => {}}
          onRetrySubmission={() => {}}
          score={1}
          showRetake={true}
          status={createStatus("unredeemed")}
        />,
      );

      const resultsBlock = container.querySelector(".results-block");
      const tokenBlock = container.querySelector(".token-block");
      expect(resultsBlock).not.toBeNull();
      expect(tokenBlock).not.toBeNull();
      expect(
        resultsBlock!.compareDocumentPosition(tokenBlock!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      // The code now sits below the review, so its instruction must not
      // reference scrolling down to the answers.
      expect(
        screen.getByText("Show this code to the volunteer to check in."),
      ).toBeTruthy();
    });

    it("keeps the check-in code as the leading block when review is disabled", () => {
      const { container } = render(
        <GameCompletionPanel
          answers={{ q1: ["a"] }}
          completion={createCompletionResult()}
          completionError={null}
          cta={createCta()}
          game={createGame({ feedbackMode: "instant_feedback_non_blocking" })}
          isCompletionPersisted={true}
          isSubmitting={false}
          onReset={() => {}}
          onRetake={() => {}}
          onRetrySubmission={() => {}}
          score={1}
          showRetake={true}
          status={createStatus("unredeemed")}
        />,
      );

      expect(container.querySelector(".results-block")).toBeNull();
      const tokenBlock = container.querySelector(".token-block");
      const ctaBlock = container.querySelector(".completion-cta");
      expect(tokenBlock).not.toBeNull();
      expect(ctaBlock).not.toBeNull();
      expect(
        tokenBlock!.compareDocumentPosition(ctaBlock!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("shows retry actions when completion failed", () => {
    const onReset = vi.fn();
    const onRetrySubmission = vi.fn();

    render(
      <GameCompletionPanel
        answers={{}}
        completion={null}
        completionError="Temporary backend problem."
        cta={null}
        game={createGame()}
        isCompletionPersisted={true}
        isSubmitting={false}
        onReset={onReset}
        onRetake={() => {}}
        onRetrySubmission={onRetrySubmission}
        score={0}
        showRetake={true}
        status={createStatus("unknown")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(onRetrySubmission).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText("We couldn't load your check-in code")).toBeTruthy();
  });

  describe("completion CTA block", () => {
    function renderPanel({
      completion = createCompletionResult(),
      completionError = null,
      cta = createCta(),
      isCompletionPersisted = true,
      isSubmitting = false,
      statusKind = "unredeemed" as AttendeeRedemptionStatus["kind"],
    } = {}) {
      return render(
        <GameCompletionPanel
          answers={{ q1: ["a"] }}
          completion={completion}
          completionError={completionError}
          cta={cta}
          game={createGame()}
          isCompletionPersisted={isCompletionPersisted}
          isSubmitting={isSubmitting}
          onReset={() => {}}
          onRetake={() => {}}
          onRetrySubmission={() => {}}
          score={1}
          showRetake={true}
          status={createStatus(statusKind)}
        />,
      );
    }

    it.each([
      { statusKind: "unredeemed" as const },
      { statusKind: "redeemed" as const },
    ])(
      "renders all three CTAs below the entitlement result in the $statusKind state",
      ({ statusKind }) => {
        renderPanel({ statusKind });

        expect(
          screen.getByRole("heading", { name: "Enjoying Music in the Playfield?" }),
        ).toBeTruthy();

        const emailListLink = screen.getByRole("link", {
          name: "Join the email list",
        });
        // Config-owned destination: the game's own slug is "test-game", so
        // this proves the href comes from the CTA config, not the slug.
        expect(emailListLink.getAttribute("href")).toBe(
          "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email",
        );

        const donateLink = screen.getByRole("link", {
          name: "Support the Playfield",
        });
        expect(donateLink.getAttribute("href")).toBe(
          "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
        );

        const volunteerLink = screen.getByRole("link", { name: "Volunteer" });
        expect(volunteerLink.getAttribute("href")).toBe(
          "https://madrona.us/volunteers/",
        );

        // The CTA rides below the entitlement result, never above it.
        const panel = screen.getByRole("heading", {
          name: "Enjoying Music in the Playfield?",
        }).closest(".completion-panel");
        const tokenBlock = panel?.querySelector(".token-block");
        const ctaBlock = panel?.querySelector(".completion-cta");
        expect(tokenBlock).not.toBeNull();
        expect(ctaBlock).not.toBeNull();
        expect(
          tokenBlock!.compareDocumentPosition(ctaBlock!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      },
    );

    // Both persistence states crossed with both link kinds. The two
    // reasons a CTA link opens in a new context are independent, and a
    // single-state case cannot surface the failure that matters most
    // here: an external link quietly reverting to the same tab once the
    // completed state becomes durable.
    it.each([
      {
        kind: "external",
        link: EXTERNAL_CTA_LINK,
        isCompletionPersisted: true,
        newContext: true,
      },
      {
        kind: "external",
        link: EXTERNAL_CTA_LINK,
        isCompletionPersisted: false,
        newContext: true,
      },
      {
        kind: "same-origin",
        link: SAME_ORIGIN_CTA_LINK,
        isCompletionPersisted: true,
        newContext: false,
      },
      {
        kind: "same-origin",
        link: SAME_ORIGIN_CTA_LINK,
        isCompletionPersisted: false,
        newContext: true,
      },
    ])(
      "opens a $kind CTA link in a new context: $newContext (persisted: $isCompletionPersisted)",
      ({ link, isCompletionPersisted, newContext }) => {
        renderPanel({
          cta: createCta({ emailList: link, donate: undefined }),
          isCompletionPersisted,
        });

        const rendered = screen.getByRole("link", { name: link.buttonLabel });

        if (newContext) {
          expect(rendered.getAttribute("target")).toBe("_blank");
          expect(rendered.getAttribute("rel")).toBe("noopener");
        } else {
          expect(rendered.getAttribute("target")).toBeNull();
          expect(rendered.getAttribute("rel")).toBeNull();
        }
      },
    );

    it("omits the email-list CTA when the event has no email-list destination", () => {
      renderPanel({ cta: createCta({ emailList: undefined }) });

      expect(screen.queryByRole("link", { name: "Join the email list" })).toBeNull();
      expect(screen.getByRole("link", { name: "Support the Playfield" })).toBeTruthy();
    });

    it("omits the donate CTA when the event has no donation destination", () => {
      renderPanel({ cta: createCta({ donate: undefined }) });

      expect(screen.getByRole("link", { name: "Join the email list" })).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Support the Playfield" })).toBeNull();
    });

    it("renders no CTA block for events without a registry entry", () => {
      const { container } = renderPanel({ cta: null });

      expect(container.querySelector(".completion-cta")).toBeNull();
    });

    it("omits the volunteer CTA when the event has nowhere to send a volunteer", () => {
      renderPanel({ cta: createCta({ volunteer: undefined }) });

      expect(screen.queryByRole("link", { name: "Volunteer" })).toBeNull();
      expect(
        screen.getByRole("link", { name: "Join the email list" }),
      ).toBeTruthy();
    });

    it.each([
      { only: "emailList", label: "Join the email list" },
      { only: "donate", label: "Support the Playfield" },
      { only: "volunteer", label: "Volunteer" },
    ])(
      "renders the block for an event authoring only its $only section",
      ({ only, label }) => {
        // The render gate names every optional section. It listed two
        // while the shape carried three, so an event offering only the
        // third rendered nothing at all — no heading, no link, no
        // failure anywhere. Each section is checked on its own so the
        // gate cannot regress to covering just the popular two.
        const absent = { emailList: undefined, donate: undefined, volunteer: undefined };
        const { container } = renderPanel({
          cta: createCta({ ...absent, [only]: createCta()[only as "donate"] }),
        });

        expect(container.querySelector(".completion-cta")).not.toBeNull();
        expect(screen.getByRole("link", { name: label })).toBeTruthy();
      },
    );

    it("renders no CTA block when all three sections are absent", () => {
      const { container } = renderPanel({
        cta: createCta({
          donate: undefined,
          emailList: undefined,
          volunteer: undefined,
        }),
      });

      expect(container.querySelector(".completion-cta")).toBeNull();
    });

    it("keeps the CTA hidden while the completion is still submitting", () => {
      const { container } = renderPanel({ completion: null, isSubmitting: true });

      expect(container.querySelector(".completion-cta")).toBeNull();
    });

    it("keeps the CTA hidden when completion failed", () => {
      const { container } = renderPanel({
        completion: null,
        completionError: "Temporary backend problem.",
        statusKind: "unknown",
      });

      expect(container.querySelector(".completion-cta")).toBeNull();
    });
  });
});
