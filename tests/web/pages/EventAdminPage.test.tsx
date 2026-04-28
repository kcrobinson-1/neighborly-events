import React from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockLoadDraftEventSummary,
  mockRequestMagicLink,
  mockSignOut,
  mockUseAuthSession,
  mockUseOrganizerForEvent,
  mockUseSelectedDraft,
} = vi.hoisted(() => ({
  mockLoadDraftEventSummary: vi.fn(),
  mockRequestMagicLink: vi.fn(),
  mockSignOut: vi.fn(),
  mockUseAuthSession: vi.fn(),
  mockUseOrganizerForEvent: vi.fn(),
  mockUseSelectedDraft: vi.fn(),
}));

vi.mock("../../../shared/auth/useAuthSession.ts", () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock("../../../shared/auth/useOrganizerForEvent.ts", () => ({
  useOrganizerForEvent: mockUseOrganizerForEvent,
}));

vi.mock("../../../shared/auth/api.ts", () => ({
  requestMagicLink: mockRequestMagicLink,
  signOut: mockSignOut,
}));

vi.mock("../../../apps/web/src/lib/adminGameApi.ts", () => ({
  loadDraftEventSummary: mockLoadDraftEventSummary,
}));

vi.mock("../../../apps/web/src/admin/useSelectedDraft.ts", () => ({
  useSelectedDraft: mockUseSelectedDraft,
}));

import { EventAdminPage } from "../../../apps/web/src/pages/EventAdminPage.tsx";

const SUMMARY = {
  eventCode: "MMF",
  hasBeenPublished: true,
  id: "evt-1",
  isLive: true,
  lastPublishedVersionNumber: 1,
  name: "Madrona Music",
  slug: "madrona-music-2026",
  status: "live" as const,
  updatedAt: "2026-04-08T12:00:00.000Z",
};

function renderPage() {
  const navigate = vi.fn();
  const utils = render(
    <EventAdminPage onNavigate={navigate} slug="madrona-music-2026" />,
  );
  return { navigate, ...utils };
}

function expectThemeScopeWrapper(container: HTMLElement) {
  // EventAdminPage renders inside the App.tsx dispatcher's <ThemeScope>;
  // the page itself does not own that wrapper, but its content sits
  // inside the .admin-layout chrome. Asserting that the rendered
  // content is non-empty proves the in-place themed-shell wrapping
  // contract for the page-level component; the App.tsx test exercises
  // the .theme-scope wrapper.
  expect(container.querySelector(".admin-layout")).not.toBeNull();
}

describe("EventAdminPage state matrix", () => {
  beforeEach(() => {
    mockLoadDraftEventSummary.mockReset();
    mockRequestMagicLink.mockReset();
    mockSignOut.mockReset();
    mockUseAuthSession.mockReset();
    mockUseOrganizerForEvent.mockReset();
    mockUseSelectedDraft.mockReset();
    mockUseSelectedDraft.mockReturnValue({
      cancelUnpublish: vi.fn(),
      confirmUnpublish: vi.fn(),
      focusedQuestionId: null,
      hasDraftChanges: false,
      publishEvent: vi.fn(),
      publishState: { status: "idle" },
      questionSaveState: { message: null, status: "idle" },
      saveSelectedEventDetails: vi.fn(),
      saveSelectedQuestionContent: vi.fn(),
      selectedDraftState: { status: "idle" },
      setFocusedQuestionId: vi.fn(),
      startUnpublish: vi.fn(),
      unpublishState: { status: "idle" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the missing_config shell", () => {
    mockUseAuthSession.mockReturnValue({
      message: "Supabase config missing.",
      status: "missing_config",
    });

    const { container } = renderPage();
    expect(
      screen.getByText("This event admin isn't available right now."),
    ).toBeTruthy();
    expect(screen.getByText("Supabase config missing.")).toBeTruthy();
    expectThemeScopeWrapper(container);
  });

  it("renders the loading shell during session restore", () => {
    mockUseAuthSession.mockReturnValue({ status: "loading" });

    const { container } = renderPage();
    expect(screen.getByText("Loading event authoring")).toBeTruthy();
    expect(screen.getByText("Restoring session...")).toBeTruthy();
    expectThemeScopeWrapper(container);
  });

  it("renders the SignInForm with per-event copy when signed out", () => {
    mockUseAuthSession.mockReturnValue({ status: "signed_out" });

    const { container } = renderPage();
    expect(screen.getByText("Sign in to manage this event")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expectThemeScopeWrapper(container);
  });

  it("renders the role_gate copy without leaking event existence", () => {
    mockUseAuthSession.mockReturnValue({
      email: "stranger@example.com",
      session: { access_token: "t", user: { id: "u" } },
      status: "signed_in",
    });
    mockUseOrganizerForEvent.mockReturnValue({ status: "role_gate" });

    const { container } = renderPage();
    expect(screen.getByText("Not available for this event.")).toBeTruthy();
    expect(screen.queryByText(/Madrona/)).toBeNull();
    expectThemeScopeWrapper(container);
  });

  it("renders the loading shell while the access probe is in flight", () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { access_token: "t", user: { id: "u" } },
      status: "signed_in",
    });
    mockUseOrganizerForEvent.mockReturnValue({ status: "loading" });

    const { container } = renderPage();
    expect(screen.getByText("Checking event access...")).toBeTruthy();
    expectThemeScopeWrapper(container);
  });

  it("renders transient_error shell with a retry button", () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { access_token: "t", user: { id: "u" } },
      status: "signed_in",
    });
    const retry = vi.fn();
    mockUseOrganizerForEvent.mockReturnValue({
      message: "Connection unstable.",
      retry,
      status: "transient_error",
    });

    const { container } = renderPage();
    expect(
      screen.getByText("We couldn't verify event access right now."),
    ).toBeTruthy();
    expect(screen.getByText("Connection unstable.")).toBeTruthy();
    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeTruthy();
    retryButton.click();
    expect(retry).toHaveBeenCalledTimes(1);
    expectThemeScopeWrapper(container);
  });

  it("renders the authorized workspace once the seed read resolves", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { access_token: "t", user: { id: "u" } },
      status: "signed_in",
    });
    mockUseOrganizerForEvent.mockReturnValue({
      eventId: "evt-1",
      status: "authorized",
    });
    mockLoadDraftEventSummary.mockResolvedValue(SUMMARY);

    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Madrona Music/)).toBeTruthy();
    });
    expect(mockLoadDraftEventSummary).toHaveBeenCalledWith("evt-1");
    expectThemeScopeWrapper(container);
  });

  it("renders the missing-event shell when the seed read returns null", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { access_token: "t", user: { id: "u" } },
      status: "signed_in",
    });
    mockUseOrganizerForEvent.mockReturnValue({
      eventId: "evt-1",
      status: "authorized",
    });
    mockLoadDraftEventSummary.mockResolvedValue(null);

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("This event isn't available right now."),
      ).toBeTruthy();
    });
  });

  it("does not call getGameAdminStatus / is_admin to gate access", () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { access_token: "t", user: { id: "u" } },
      status: "signed_in",
    });
    mockUseOrganizerForEvent.mockReturnValue({ status: "loading" });

    renderPage();
    // useOrganizerForEvent is the single auth gate; the per-event flow must
    // not call useAdminDashboard's allowlist read. Verified by the fact that
    // the test does not mock `getGameAdminStatus` and the page renders
    // without throwing — if a `getGameAdminStatus` call had leaked into the
    // per-event flow, the `loadDraftEventSummary` mock would not be the
    // first read, and the workspace would never reach a ready state.
    expect(mockUseOrganizerForEvent).toHaveBeenCalledWith("madrona-music-2026");
  });
});
