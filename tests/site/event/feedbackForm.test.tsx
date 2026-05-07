import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

const { mockGetBrowserSupabaseClient, insertSpy } = vi.hoisted(() => ({
  mockGetBrowserSupabaseClient: vi.fn(),
  insertSpy: vi.fn(),
}));

vi.mock("../../../apps/site/lib/supabaseBrowser.ts", () => ({
  getBrowserSupabaseClient: mockGetBrowserSupabaseClient,
}));

import { FeedbackForm } from "../../../apps/site/app/event/[slug]/feedback/FeedbackForm.tsx";
import type { EventContent } from "../../../apps/site/lib/eventContent.ts";

type FeedbackContent = NonNullable<EventContent["feedback"]>;

function makeFeedback(overrides: Partial<FeedbackContent> = {}): FeedbackContent {
  return {
    cta: { heading: "Feedback please", body: "Tell us what you thought." },
    ratingDimensions: [
      { key: "music", label: "Music" },
      { key: "vibes", label: "Vibes" },
      { key: "overall", label: "Overall" },
    ],
    freeTextPrompt: "Anything else?",
    emailCopy: {
      label: "Email",
      declineLabel: "I'd rather not share my email",
      newsletterOptInLabel: "Add me to the newsletter",
    },
    thankYouMessage: "Thanks — we read every response.",
    ...overrides,
  };
}

function setInsertResult(result: { error: { message: string } | null }) {
  insertSpy.mockResolvedValueOnce(result);
}

beforeEach(() => {
  insertSpy.mockReset();
  mockGetBrowserSupabaseClient.mockReset();
  mockGetBrowserSupabaseClient.mockReturnValue({
    from: () => ({ insert: insertSpy }),
  });
});

afterEach(cleanup);

describe("FeedbackForm — rating rows", () => {
  it("renders one rating row per feedback.ratingDimensions entry", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    // Three dimensions in the fixture.
    expect(screen.getAllByRole("group", { name: "Music" })).toHaveLength(1);
    expect(screen.getAllByRole("group", { name: "Vibes" })).toHaveLength(1);
    expect(screen.getAllByRole("group", { name: "Overall" })).toHaveLength(1);
  });

  it("tapping a star sets the rating; tapping N/A clears stars and marks N/A", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    const musicRow = screen.getByRole("group", { name: "Music" });
    const star4 = within(musicRow).getByRole("button", {
      name: "Music: 4 of 5",
    });
    fireEvent.click(star4);
    expect(star4.getAttribute("aria-pressed")).toBe("true");

    const naButton = within(musicRow).getByRole("button", { name: "N/A" });
    fireEvent.click(naButton);
    expect(naButton.getAttribute("aria-pressed")).toBe("true");
    // Star 4 is no longer pressed.
    expect(star4.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("FeedbackForm — decline / email / newsletter conditional rendering", () => {
  it("decline checkbox hides the email field and the newsletter row", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    // Email visible by default.
    expect(screen.getByLabelText("Email")).toBeTruthy();
    // Newsletter row not reachable yet (email blank).
    expect(
      screen.queryByLabelText("Add me to the newsletter"),
    ).toBeNull();

    fireEvent.click(
      screen.getByLabelText("I'd rather not share my email"),
    );
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(
      screen.queryByLabelText("Add me to the newsletter"),
    ).toBeNull();
  });

  it("newsletter row is structurally unreachable when email is blank or decline is checked", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    // Blank email: newsletter not in the DOM.
    expect(
      screen.queryByLabelText("Add me to the newsletter"),
    ).toBeNull();

    // Type an email: newsletter appears.
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    expect(screen.getByLabelText("Add me to the newsletter")).toBeTruthy();

    // Tick decline: email + newsletter both hidden.
    fireEvent.click(
      screen.getByLabelText("I'd rather not share my email"),
    );
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(
      screen.queryByLabelText("Add me to the newsletter"),
    ).toBeNull();
  });
});

describe("FeedbackForm — submission validation", () => {
  it("rejects malformed email on submit and does not insert", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(screen.getByRole("alert").textContent).toMatch(
      /Enter an email like/,
    );
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("empty free-text submits as null, not empty string", async () => {
    setInsertResult({ error: null });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Submit feedback" }),
      );
    });
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.free_text).toBeNull();
    expect(payload.event_slug).toBe("madrona");
  });

  it("decline state submits with email_declined=true, email=null, newsletter_opt_in=false", async () => {
    setInsertResult({ error: null });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    // Type an email and tick newsletter, THEN click decline — decline must
    // override both per the Submission Shape contract guard 2.
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.click(screen.getByLabelText("Add me to the newsletter"));
    fireEvent.click(
      screen.getByLabelText("I'd rather not share my email"),
    );
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Submit feedback" }),
      );
    });
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    const payload = insertSpy.mock.calls[0][0];
    expect(payload).toMatchObject({
      email: null,
      email_declined: true,
      newsletter_opt_in: false,
    });
  });
});

describe("FeedbackForm — state machine", () => {
  it("transitions idle → submitting → success and replaces the form with the thank-you message", async () => {
    let resolveInsert: (value: { error: null }) => void = () => {};
    insertSpy.mockReturnValueOnce(
      new Promise<{ error: null }>((resolve) => {
        resolveInsert = resolve;
      }),
    );
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    const submit = screen.getByRole("button", { name: "Submit feedback" });
    await act(async () => {
      fireEvent.click(submit);
    });
    // Submitting state: button disabled, label changed.
    expect(
      screen.getByRole("button", { name: "Submitting…" }).hasAttribute("disabled"),
    ).toBe(true);

    await act(async () => {
      resolveInsert({ error: null });
    });
    await waitFor(() =>
      expect(screen.getByText("Thanks — we read every response.")).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: "Submit feedback" })).toBeNull();
  });

  it("transitions submitting → error on insert failure, preserves field values, and supports retry", async () => {
    setInsertResult({ error: { message: "boom" } });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Anything else?"), {
      target: { value: "Loved the show." },
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Submit feedback" }),
      );
    });
    await waitFor(() =>
      expect(
        screen.getByText("Couldn't submit your feedback. Please try again."),
      ).toBeTruthy(),
    );
    // Fields preserved.
    expect(
      (screen.getByLabelText("Email") as HTMLInputElement).value,
    ).toBe("fan@example.com");
    expect(
      (screen.getByLabelText("Anything else?") as HTMLTextAreaElement).value,
    ).toBe("Loved the show.");

    // Retry path: insert succeeds, form transitions to success.
    setInsertResult({ error: null });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Submit feedback" }),
      );
    });
    await waitFor(() =>
      expect(screen.getByText("Thanks — we read every response.")).toBeTruthy(),
    );
    expect(insertSpy).toHaveBeenCalledTimes(2);
  });
});
