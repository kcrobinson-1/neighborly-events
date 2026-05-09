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

const { mockGetBrowserSupabaseClient, insertSpy, setHeaderSpy } = vi.hoisted(
  () => ({
    mockGetBrowserSupabaseClient: vi.fn(),
    insertSpy: vi.fn(),
    setHeaderSpy: vi.fn(),
  }),
);

// The form chains `.insert(...).setHeader("Prefer", "return=minimal")` so
// PostgREST skips its default `RETURNING *` (anon has INSERT-only on the
// table). The test double mirrors that chain: insertSpy records the row
// payload, setHeaderSpy records the header args and returns a thenable
// resolving to the configured result.
function makeInsertBuilder<T>(resultPromise: Promise<T>) {
  setHeaderSpy.mockReturnValueOnce(resultPromise);
  return { setHeader: setHeaderSpy };
}

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
      newsletterOptInLabel: "Add me to the newsletter",
    },
    thankYouMessage: "Thanks — we read every response.",
    ...overrides,
  };
}

function setInsertResult(result: { error: { message: string } | null }) {
  insertSpy.mockReturnValueOnce(
    makeInsertBuilder(Promise.resolve(result)),
  );
}

beforeEach(() => {
  insertSpy.mockReset();
  setHeaderSpy.mockReset();
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

describe("FeedbackForm — email / newsletter coupling", () => {
  it("the form has no decline checkbox; the email field is always visible", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(
      screen.queryByLabelText("I'd rather not share my email"),
    ).toBeNull();
  });

  it("newsletter checkbox renders but is disabled when email is blank, enabled once an email is typed, and re-disabled when the email is cleared", () => {
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    const newsletter = screen.getByLabelText(
      "Add me to the newsletter",
    ) as HTMLInputElement;
    // Always rendered; disabled when email is blank.
    expect(newsletter.disabled).toBe(true);
    expect(newsletter.checked).toBe(false);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    expect(newsletter.disabled).toBe(false);

    // Tick it.
    fireEvent.click(newsletter);
    expect(newsletter.checked).toBe(true);

    // Clear the email — newsletter unchecks and re-disables.
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "" },
    });
    expect(newsletter.disabled).toBe(true);
    expect(newsletter.checked).toBe(false);
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

  it("sends Prefer: return=minimal so PostgREST skips RETURNING (anon lacks SELECT)", async () => {
    setInsertResult({ error: null });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Submit feedback" }),
      );
    });
    await waitFor(() => expect(setHeaderSpy).toHaveBeenCalledTimes(1));
    expect(setHeaderSpy).toHaveBeenCalledWith("Prefer", "return=minimal");
  });

  it("blank email submits as the implicit decline: email=null, email_declined=true, newsletter_opt_in=false", async () => {
    setInsertResult({ error: null });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
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

  it("clearing a typed email after ticking newsletter resets newsletter to false on submit", async () => {
    setInsertResult({ error: null });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.click(screen.getByLabelText("Add me to the newsletter"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "" },
    });
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

  it("email + newsletter ticked submits both and email_declined=false", async () => {
    setInsertResult({ error: null });
    render(<FeedbackForm feedback={makeFeedback()} slug="madrona" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.click(screen.getByLabelText("Add me to the newsletter"));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Submit feedback" }),
      );
    });
    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    const payload = insertSpy.mock.calls[0][0];
    expect(payload).toMatchObject({
      email: "fan@example.com",
      email_declined: false,
      newsletter_opt_in: true,
    });
  });
});

describe("FeedbackForm — state machine", () => {
  it("transitions idle → submitting → success and replaces the form with the thank-you message", async () => {
    let resolveInsert: (value: { error: null }) => void = () => {};
    insertSpy.mockReturnValueOnce(
      makeInsertBuilder(
        new Promise<{ error: null }>((resolve) => {
          resolveInsert = resolve;
        }),
      ),
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
